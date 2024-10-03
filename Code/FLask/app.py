import configparser

from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('MyWebsite.html')

if __name__ == '__main__':
    config = configparser.ConfigParser()
    config.read('Config_Path.ini')
    app.run(host=config['flask']['server_ip'], debug=False, threaded=True)
