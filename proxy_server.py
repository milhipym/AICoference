#!/usr/bin/env python3
"""
CORS Proxy Server for AI Log Analysis
프록시 서버: 브라우저 CORS 문제를 해결하기 위해 API 요청을 중계합니다.
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import urllib.request
import urllib.error
import sys
from urllib.parse import urlparse, parse_qs

# API 서버 기본 URL
API_BASE_URL = "http://10.10.22.81:8080"

class CORSProxyHandler(SimpleHTTPRequestHandler):
    """CORS를 지원하는 프록시 HTTP 핸들러"""
    
    def end_headers(self):
        """모든 응답에 CORS 헤더 추가"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        """CORS preflight 요청 처리"""
        self.send_response(200)
        self.end_headers()
    
    def do_POST(self):
        """POST 요청 처리 - API 프록시"""
        path = self.path
        
        # /api/ 경로로 시작하는 요청만 프록시
        if path.startswith('/api/'):
            # /api/ 제거하고 실제 API 경로 추출
            api_path = path[5:]  # '/api/' 제거
            target_url = f"{API_BASE_URL}/{api_path}"
            
            try:
                # 요청 본문 읽기
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length) if content_length > 0 else b''
                
                print(f"[PROXY] POST {path} -> {target_url}")
                print(f"[PROXY] Body length: {len(post_data)} bytes")
                
                # API 서버로 요청 전달
                req = urllib.request.Request(
                    target_url,
                    data=post_data,
                    headers={'Content-Type': 'application/json'},
                    method='POST'
                )
                
                # 응답 받기
                with urllib.request.urlopen(req, timeout=300) as response:
                    response_data = response.read()
                    
                    # 클라이언트에 응답 전송
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(response_data)
                    
                    print(f"[PROXY] Success: {len(response_data)} bytes returned")
                    
            except urllib.error.HTTPError as e:
                print(f"[PROXY] HTTP Error {e.code}: {e.reason}")
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_response = json.dumps({
                    'error': f'API Error: {e.reason}',
                    'code': e.code
                }).encode()
                self.wfile.write(error_response)
                
            except urllib.error.URLError as e:
                print(f"[PROXY] URL Error: {e.reason}")
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_response = json.dumps({
                    'error': f'Cannot reach API server: {e.reason}'
                }).encode()
                self.wfile.write(error_response)
                
            except Exception as e:
                print(f"[PROXY] Unexpected error: {str(e)}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_response = json.dumps({
                    'error': f'Proxy error: {str(e)}'
                }).encode()
                self.wfile.write(error_response)
        else:
            # 일반 파일 서빙 (기본 동작)
            super().do_POST()
    
    def log_message(self, format, *args):
        """로그 메시지 출력"""
        sys.stdout.write(f"[{self.log_date_time_string()}] {format % args}\n")
        sys.stdout.flush()

def run_server(port=8000):
    """프록시 서버 실행"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, CORSProxyHandler)
    
    print(f"=" * 60)
    print(f"🚀 CORS Proxy Server Started")
    print(f"=" * 60)
    print(f"📍 Local URL: http://localhost:{port}")
    print(f"🔗 API Proxy: http://localhost:{port}/api/...")
    print(f"🎯 Target API: {API_BASE_URL}")
    print(f"=" * 60)
    print(f"💡 Usage:")
    print(f"   Browser -> http://localhost:{port}/api/vllm_chat")
    print(f"   Server  -> {API_BASE_URL}/vllm_chat")
    print(f"=" * 60)
    print(f"Press Ctrl+C to stop the server")
    print()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        httpd.server_close()

if __name__ == '__main__':
    run_server(8000)
