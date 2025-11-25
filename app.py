from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/')
def hello():
    return 'Hello World! 我的Flask程序已经在互联网上运行了！'

@app.route('/api/data')
def get_data():
    data = {
        'message': 'Hello from Flask API!',
        'timestamp': request.args.get('timestamp', 'unknown'),
        'status': 'success'
    }
    return jsonify(data)

@app.route('/api/post', methods=['POST'])
def post_data():
    if request.is_json:
        data = request.get_json()
        return jsonify({
            'message': 'Data received successfully!',
            'received_data': data,
            'status': 'success'
        }), 201
    return jsonify({'error': 'Request must be JSON'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
