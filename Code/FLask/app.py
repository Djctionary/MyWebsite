import base64
import io
import json
import numpy as np
import requests
from PIL import Image
from flask import Flask, render_template, request, jsonify, g, jsonify, session, send_from_directory
import os
import configparser
from werkzeug.utils import secure_filename
from datetime import datetime
import uuid
import logging
import time
import re

config = configparser.ConfigParser()
config.read('Config_Path.ini')

# 从配置文件中获取 API Key
openai.api_key = config['openai']['api_key']

# 创建 AzureOpenAI 客户端
api_base = config['azure_openai']['api_base']
api_key = config['azure_openai']['api_key']
deployment_name = config['azure_openai']['deployment_name']
api_version = config['azure_openai']['api_version']

client = AzureOpenAI(
    api_key=api_key,
    api_version=api_version,
    base_url=f"{api_base}openai/deployments/{deployment_name}"
)
app = Flask(__name__)

app.secret_key = config['flask']['secret_key']
app.config['UPLOAD_FOLDER'] = config['flask']['upload_folder']
app.config['MAX_CONTENT_LENGTH'] = int(eval(config['flask']['max_content_length']))
logging.getLogger().setLevel(logging.INFO)

# 确保上传文件夹存在
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# 允许用户上传的文件扩展名
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
# 输出PPT名字与路径
file_name = 'ocr_flowchart.pptx'


@app.route('/')
def index():
    return render_template('chartPPT.html')


@app.route('/get_user_tag', methods=['GET'])
def get_user_tag():
    user_tag = 'tag_' + str(uuid.uuid4())
    print(f"Generated user_tag: {user_tag}")  # 打印生成的 user_tag
    return jsonify({"user_tag": user_tag})


@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'file' not in request.files :
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    user_tag = request.form.get('user_tag')  # 从请求表单中获取 user_tag

    if not user_tag:
        return jsonify({'error': 'User tag is missing'}), 400

    if file.filename == '':
        return 'No selected file', 400

    if file:
        # 生成用户专属文件夹路径
        user_folder = os.path.join(app.config['UPLOAD_FOLDER'], user_tag, 'input')
        ppt_folder = os.path.join(app.config['UPLOAD_FOLDER'], user_tag, 'output')
        # 确保文件夹存在
        if not os.path.exists(user_folder):
            os.makedirs(user_folder)
        if not os.path.exists(ppt_folder):
            os.makedirs(ppt_folder)
        # 获取文件扩展名
        file_extension = file.filename.rsplit('.', 1)[1].lower()

        # 生成自定义文件名
        unique_filename = f"img_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex}.{file_extension}"

        # 保存文件
        file.save(os.path.join(str(user_folder), secure_filename(unique_filename)))
        return 'Success', 200

    return 'Error', 400



def allowed_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/file-status', methods=['GET'])
def file_status():
    user_tag = request.args.get('user_tag')  # 从查询参数中获取 user_tag
    if not user_tag:
        return jsonify({'error': 'User tag is required'}), 400
    # 生成完整文件路径
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], user_tag, 'output', file_name)

    # 检查文件是否存在
    if os.path.exists(file_path):
        # 获取文件最后修改时间
        last_modified = os.path.getmtime(file_path)
        last_modified_iso = datetime.fromtimestamp(last_modified).isoformat()
        logging.info(f'File status checked: {file_path} lastModified={last_modified_iso}')
        return jsonify({'lastModified': last_modified_iso})
    else:
        logging.info(f'File not found: {file_path}')
        return jsonify({'error': 'File not found'}), 404


@app.route('/download-file', methods=['GET'])
def download_file():
    user_tag = request.args.get('user_tag')  # 从查询参数中获取 user_tag
    if not user_tag:
        return jsonify({'error': 'User tag is required'}), 400
    # 生成完整文件路径
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], user_tag, 'output', file_name)
    file_dir = os.path.join(app.config['UPLOAD_FOLDER'], user_tag, 'output')
    # 检查文件是否存在
    if os.path.exists(file_path):
        app.logger.info(f'File download requested: {file_path}')
        return send_from_directory(directory=file_dir, path=file_name, as_attachment=True)
    else:
        app.logger.error(f'File not found: {file_path}')
        return jsonify({'error': 'File not found'}), 404


@app.route("/WebAPI/PaddleOCR", methods=["POST"])
def paddle_ocr():
    data = request.json
    img_base64 = data.get("image")

    if not img_base64:
        logging.error("No image data provided.")
        return jsonify({"error": "No image data provided."}), 400

    # 解码图像
    try:
        img_byte = base64.b64decode(img_base64)
        image = io.BytesIO(img_byte)
        img = Image.open(image)
        img = np.array(img)  # 确保 img 是一个 NumPy 数组
        logging.info("Image successfully decoded and converted to NumPy array.")
    except Exception as e:
        logging.error("Error decoding image: %s", str(e), exc_info=True)
        return jsonify({"error": "Invalid image data."}), 400  # 返回错误信息

    try:
        result = ppocr.ocr(img)
        logging.info("OCR processing completed successfully.")
    except Exception as e:
        logging.error("Error during OCR processing: %s", str(e), exc_info=True)
        return jsonify({"error": "OCR processing failed."}), 500  # 返回错误信息

    # 如果有需要处理的 OCR 结果
    results = ocr_process(result)

    return jsonify(results)  # 返回 OCR 结果

@app.route('/gpt4-process', methods=['POST'])
def process_image():
    # 获取传入的图像数据（base64 编码）
    data = request.get_json()
    img_base64 = data.get('image')

    if not img_base64:
        return jsonify({"error": "No image data provided"}), 400

    logging.info("Start GPT-4 API")
    gpt4_start_time = time.time()
    try:
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "This is a flowchart with various shapes and colors. Extract the shape and color of each box that contains text "
                                "in the format 'Text: Shape - RGB(x, x, x)'. If only text is present or the shape is unknown, "
                                "use 'Unknown' for shape and 'RGB(256, 256, 256)' for color. Provide only the RGB values and "
                                "use English terms for shapes. Stick to this format without extra labels."
                                "Example: 'Log: Rectangle - RGB(153, 204, 255)'."
                            )
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{img_base64}",
                            },
                        },
                    ],
                }
            ],
            max_tokens=400,
            temperature=0.2,
            top_p=0.7
        )

        # 使用正则表达式提取文本、形状和颜色
        response_content = response.choices[0].message.content
        logging.info("Response content: %s", response_content)

        # 定义正则表达式模式
        pattern = r"([\w\s()-]+):\s*(\S+)\s*-\s*RGB\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)"

        # 使用正则表达式查找所有匹配项
        matches = re.findall(pattern, response_content)

        # 构建结果列表，将 RGB 颜色值合并为字符串形式
        gpt_results = [{"text": match[0].strip(), "shape": match[1], "color": f"RGB({match[2]}, {match[3]}, {match[4]})"}
                       for match in matches]

        # 检查是否找到匹配项
        if not gpt_results:
            logging.error("No valid shapes and colors found.")
            return jsonify({"error": "No valid shapes and colors found."}), 500

    except Exception as e:
        logging.error("Error occurred: %s", str(e), exc_info=True)  # 捕获堆栈跟踪信息
        return jsonify({"error": "An error occurred while processing the request."}), 500

    gpt4_end_time = time.time()

    # 计算并打印调用时间
    gpt4_execution_time = gpt4_end_time - gpt4_start_time
    logging.info("GPT-4 API 调用时间: %.2f 秒", gpt4_execution_time)

    return jsonify(gpt_results)  # 返回结果为 JSON 格式

@app.route('/run_main_logic', methods=['POST'])
def process():
    # 接收图像数据
    data = request.get_json()  # 从请求中获取 JSON 数据
    img_base64 = data.get('image')  # 获取图像数据
    user_tag = data.get('user_tag')  # 获取 user_tag

    # 检查 Base64 字符串的有效性和类型
    if img_base64.startswith('data:image/png;base64,'):
        img_base64 = img_base64.split(',')[1]
         mime_type = 'image/png'
    elif img_base64.startswith('data:image/jpeg;base64,'):
        img_base64 = img_base64.split(',')[1]
        mime_type = 'image/jpeg'
    elif img_base64.startswith('data:image/gif;base64,'):
        img_base64 = img_base64.split(',')[1]
        mime_type = 'image/gif'
    else:
        return jsonify({"error": "Invalid base64 image format."}), 400  # 返回错误信息

    # 解码 base64 图像
    try:
        img_byte = base64.b64decode(img_base64)
    except Exception as e:
        return jsonify({"error": "Invalid base64 image."}), 400

    # 将图像传递给 PaddleOCR API
    ocr_response = requests.post(
        f"http://{config['flask']['server_ip']}:5000/WebAPI/PaddleOCR",
        json={"image": img_base64}
    )

    if ocr_response.status_code == 200 and ocr_response:
        ocr_results = ocr_response.json()
    else:
        return jsonify({"error": f"Failed to communicate with GPT API, status code: {ocr_response.status_code}"}), 500

    gpt_response = requests.post(
        f"http://{config['flask']['server_ip']}:5000/gpt4-process",
        json={"image": img_base64}
    )

    if gpt_response.status_code == 200 and gpt_response:
        gpt_results = gpt_response.json()
    else:
        return jsonify({"error": f"Failed to communicate with GPT API, status code: {gpt_response.status_code}"}), 500

    print(ocr_results)
    print(gpt_results)

    ppt_process(ocr_results, gpt_results, user_tag)

    return jsonify({"success": "Great!"}), 200


if __name__ == '__main__':
    ppocr = paddleocr.PaddleOCR(use_gpu=False)
    app.run(host=config['flask']['server_ip'], debug=False, threaded=True)
    # app.run(host=config['flask']['server_ip'], port=5000, debug=False, threaded=True)