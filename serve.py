import http.server
import socketserver

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()

with socketserver.TCPServer(('0.0.0.0', 8000), Handler) as httpd:
    print('serving on 0.0.0.0:8000 (no-cache)')
    httpd.serve_forever()
