import http.server
import socketserver
import urllib.request
import urllib.error
import os

PORT = int(os.environ.get("PORT", 5173))

# Dynamic URL routing based on environment
if os.environ.get("PORT") and not os.environ.get("LOCAL_DEV"):
    BACKEND_URL = os.environ.get("BACKEND_URL", "https://invoiceflow-production-2c53.up.railway.app")
else:
    BACKEND_URL = "http://127.0.0.1:5000"

def safe_copy_headers(source_headers, target_handler):
    ignore_headers = {
        'connection', 'transfer-encoding', 'content-length', 
        'keep-alive', 'proxy-authenticate', 'proxy-authorization', 
        'te', 'trailers', 'upgrade', 'server'
    }
    for header, val in source_headers:
        if header.lower() not in ignore_headers:
            target_handler.send_header(header, val)

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/'):
            self.proxy_request('GET')
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self.proxy_request('POST')
        else:
            self.send_error(404, "File not found")

    def do_PUT(self):
        if self.path.startswith('/api/'):
            self.proxy_request('PUT')
        else:
            self.send_error(404, "File not found")

    def do_DELETE(self):
        if self.path.startswith('/api/'):
            self.proxy_request('DELETE')
        else:
            self.send_error(404, "File not found")

    def proxy_request(self, method):
        url = f"{BACKEND_URL}{self.path}"
        
        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None
        
        # Copy request headers, ignoring Host and Connection to let proxy re-define them
        headers = {}
        for header, value in self.headers.items():
            if header.lower() not in ['host', 'connection']:
                headers[header] = value
                
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        
        try:
            with urllib.request.urlopen(req) as response:
                self.send_response(response.status)
                safe_copy_headers(response.getheaders(), self)
                self.end_headers()
                self.wfile.write(response.read())
        except urllib.error.HTTPError as e:
            # Handle HTTP errors from Flask app (e.g. 400, 404, 401)
            self.send_response(e.code)
            safe_copy_headers(e.headers.items(), self)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            # Handle server-side/network errors
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f'{{"message": "Proxy connection error", "error": "{str(e)}"}}'.encode('utf-8'))

if __name__ == '__main__':
    # Ensure current working directory is the frontend directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Allow socket address reuse immediately
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
        print("==========================================================")
        print(f"  INVOICEFLOW FRONTEND DEVELOPER SERVER (Python)")
        print(f"  Url: http://localhost:{PORT}")
        print(f"  Proxy: Any /api/ requests -> {BACKEND_URL}")
        print("==========================================================")
        print("Press Ctrl+C to stop the server.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down frontend server.")
