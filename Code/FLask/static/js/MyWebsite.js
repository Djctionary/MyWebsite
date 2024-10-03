
const fileUrl = '/download-file'; // 文件下载的 API
const statusUrl = '/file-status'; // 获取文件状态的 API

let imgBase64 = ''; // 用于存储 Base64 编码的图像

let lastModified = null;
let isDownloading = true;  // 锁变量

window.onload = function() {
    const themeStyle = document.getElementById('theme-style');

    Swal.fire({
        title: 'Select Theme Color',
        input: 'select',
        inputOptions: {
            classical: 'Classical',
            cyber: 'Cyber',
            minimalism: 'Minimalism',
            natural: 'Natural',
            simplified: 'Simplified',
            vibrant: 'Vibrant'
        },
        inputPlaceholder: 'Please select a theme',
        showCancelButton: true,
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        customClass: {
            popup: 'green-popup',
            confirmButton: 'green-button',
            cancelButton: 'green-button',
        },
        preConfirm: (value) => {
            if (!value) {
                Swal.showValidationMessage('Please select a theme');
            } else {
                return value;
            }
        },
        didOpen: () => {
            // 直接在弹窗打开后设置样式
            const popup = Swal.getPopup();
            popup.style.backgroundColor = '#f0fff4'; // 淡绿色背景
            popup.style.border = '2px solid #a5d6a7'; // 较深的绿色边框

            const confirmButton = Swal.getConfirmButton();
            confirmButton.style.backgroundColor = '#a5d6a7'; // 按钮的淡绿色背景
            confirmButton.style.color = 'white'; // 按钮文字颜色

            confirmButton.onmouseover = () => {
                confirmButton.style.backgroundColor = '#81c784'; // 悬停时变为稍深的绿色
            };
            confirmButton.onmouseleave = () => {
                confirmButton.style.backgroundColor = '#a5d6a7'; // 离开悬停时恢复颜色
            };

            const cancelButton = Swal.getCancelButton();
            cancelButton.style.backgroundColor = '#a5d6a7'; // 按钮的淡绿色背景
            cancelButton.style.color = 'white'; // 按钮文字颜色

            cancelButton.onmouseover = () => {
                cancelButton.style.backgroundColor = '#81c784'; // 悬停时变为稍深的绿色
            };
            cancelButton.onmouseleave = () => {
                cancelButton.style.backgroundColor = '#a5d6a7'; // 离开悬停时恢复颜色
            };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const selectedTheme = result.value;
            switch (selectedTheme) {
                case 'classical':
                    themeStyle.setAttribute('href', "static/css/chartPPT-Classical.css");
                    break;
                case 'cyber':
                    themeStyle.setAttribute('href', "static/css/chartPPT-Cyber.css");
                    break;
                case 'minimalism':
                    themeStyle.setAttribute('href', "static/css/chartPPT-Minimalism.css");
                    break;
                case 'natural':
                    themeStyle.setAttribute('href', "static/css/chartPPT-Natural.css");
                    break;
                case 'simplified':
                    themeStyle.setAttribute('href', "static/css/chartPPT-Simplified.css");
                    break;
                case 'vibrant':
                    themeStyle.setAttribute('href', "static/css/chartPPT-Vibrant.css");
                    break;
            }
        }
    });
}

async function checkFileStatus() {
    if (isDownloading) return;  // 如果正在下载，直接退出

    try {
        const url = new URL(statusUrl, window.location.origin);
        url.searchParams.append('user_tag', sessionStorage.getItem('user_tag'));  // 将 user_tag 作为查询参数

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (lastModified !== data.lastModified && data.lastModified) {
            console.log('File has changed. Previous lastModified:', lastModified);
            lastModified = data.lastModified;
            console.log('New lastModified:', lastModified);

            // 启用锁
            isDownloading = true;

            // 触发文件下载
            await downloadFile();

            // 下载完成后释放锁
            isDownloading = false;
        }
    } catch (error) {
        console.error('Error checking file status:', error);
        isDownloading = false;  // 确保出错时也释放锁
    }
}

function enableButton(button) {
  button.classList.remove('disabled');
  button.classList.add('enabled');
  button.disabled = false;
}


function disableButton(button) {
  button.classList.remove('enabled');
  button.classList.add('disabled');
  button.disabled = true;
}

function downloadFile() {
    // 显示弹窗提示用户文件开始下载
    Swal.fire({
        title: 'Download Started',
        text: 'Your file is being downloaded.',
        icon: 'info',
        timer: 2000,
        showConfirmButton: false
    });


    // 创建一个临时的 <a> 元素
    const link = document.createElement('a');
    const userTag = encodeURIComponent(sessionStorage.getItem('user_tag')); // 获取并编码 user_tag
    link.href = `${fileUrl}?user_tag=${userTag}`; // 通过查询参数发送 user_tag
    link.download = 'ocr_flowchart.pptx'; // 设置下载文件名

    // 将 <a> 元素添加到页面中并模拟点击
    document.body.appendChild(link);
    link.click();

    // 移除 <a> 元素
    document.body.removeChild(link);
}



document.addEventListener('DOMContentLoaded', function() {

    fetch('/get_user_tag')
    .then(response => response.json())
    .then(data => {
        console.log(data.user_tag)
        // 存储 user_tag 到 sessionStorage
        sessionStorage.setItem('user_tag', data.user_tag);
        console.log('userTag:', sessionStorage.getItem('user_tag'));
    })
    .catch(error => {
        console.error('Error fetching user_tag:', error);
    });

    const button = document.getElementById('convert-button');
    disableButton(button)



    // 每隔 0.5 秒检查一次文件状态
    setInterval(checkFileStatus, 500);

    const upload = document.getElementById('upload');

    const download = document.getElementById('download');
    const convertButton = document.getElementById('convert-button');
    const selectLabel = document.getElementById('select-label');
    const image = document.getElementById('image');
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');

    upload.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imgBase64 = e.target.result; // 获取 Base64 编码的图像并保存
                const img = new Image();
                img.onload = function() {
                    // 在这里可以进行图像预览或其他处理
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    canvas.style.display = 'block';
                    selectLabel.style.display = 'none';
                };
                img.src = imgBase64; // 将图像显示在画布上
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('upload').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            Swal.fire({
                title: 'No File Selected',
                text: 'Please select a file to upload.',
                icon: 'warning',
                confirmButtonText: 'OK'
            });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const userTag = sessionStorage.getItem('user_tag');
        formData.append('user_tag', userTag);

        fetch('/upload_image', {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(text => {
            console.log('Response text:', text);
            if (text === 'Success') {
                Swal.fire({
                    title: 'Success!',
                    text: 'File uploaded successfully.',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
            } else if (text === 'Error') {
                Swal.fire({
                    title: 'Upload Failed',
                    text: 'An error occurred while uploading the file.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            } else {
                Swal.fire({
                    title: 'Unexpected Response',
                    text: 'Unexpected response: ' + text,
                    icon: 'info',
                    confirmButtonText: 'OK'
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire({
                title: 'Error!',
                text: 'An error occurred. Check the console for details.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        });

        enableButton(button)

    });

    convertButton.addEventListener('click', (event) => {
        Swal.fire({
            title: 'Processing...',
            text: 'Starting to convert the image. Please wait...',
            icon: 'info',
            allowOutsideClick: false, // 禁止用户点击弹窗外部区域关闭弹窗
            didOpen: () => {
                Swal.showLoading(); // 显示加载动画
            }
        });

        const requestBody = {
            image: imgBase64,
            user_tag: sessionStorage.getItem('user_tag')
        };

        fetch('/run_main_logic', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)  // 将图像数据和 user_tag 封装为 JSON
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success: Image sent to main logic:', data);
            isDownloading = false
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    });


});

