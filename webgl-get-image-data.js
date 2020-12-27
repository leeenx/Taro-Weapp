/**
 * @author 01392692
 * @description 主要代码来源：https://www.cnblogs.com/bsman/p/6128447.html
 * @ 主要是用来解决微信小程序 iOS weChat 7.0.20 的「2d canvas」 BUG
 * @ 具体说来是「 2d canvas」没办法用来画图片，但是「webgl canvas」是可以正常工作的
 * @ 但是使用 webgl 来画平面图片很复杂，当前代码是我完善后可以使用 webgl 画图的小工具
 */
import Taro from '@tarojs/taro';

const typedArrayToBuffer = array => {
    return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset)
}

let offScreenCanvas;
let webgl;

export default function webglGetImageData (imagePath) {
    if (!offScreenCanvas) {
        offScreenCanvas = Taro.createOffscreenCanvas();
        webgl = offScreenCanvas.getContext('webgl', { preserveDrawingBuffer: true });
    }
    //顶点着色器程序
    var VSHADER_SOURCE =
    "attribute vec4 a_Position;" +
    "attribute vec2 a_TextCoord;" + // 接受纹理坐标
    "varying vec2 v_TexCoord;" +    // 传递纹理坐标
    "void main() {" +
        //设置坐标
    "gl_Position = a_Position; " +  // 设置坐标
        //设置纹素
    "v_TexCoord = a_TextCoord; " +  // 设置纹理坐标
    "} ";

    //片元着色器
    var FSHADER_SOURCE =
    "precision mediump float;" +  //需要声明浮点数精度，否则报错No precision specified for (float)
    "uniform sampler2D u_Sampler;" + // 取样器
    "varying vec2 v_TexCoord;" +  // 接受纹理坐标
    "void main() {" +
        //设置颜色
    "gl_FragColor = texture2D(u_Sampler, v_TexCoord);" +  // 设置颜色
    "}";

    //编译着色器
    var vertShader = webgl.createShader(webgl.VERTEX_SHADER);
    webgl.shaderSource(vertShader, VSHADER_SOURCE);
    webgl.compileShader(vertShader);

    var fragShader = webgl.createShader(webgl.FRAGMENT_SHADER);
    webgl.shaderSource(fragShader, FSHADER_SOURCE);
    webgl.compileShader(fragShader);

    function initBuffers(gl, shaderProgram) {
        //顶点坐标和颜色
        var vertices = new Float32Array([
            -1.0,  1.0, 0.0, 1.0,
            -1, -1.0, 0.0, 0.0,
            1.0,  1.0, 1.0, 1.0,
			1.0, -1.0, 1.0, 0.0
		]);
        var n = 4;//点的个数
        //创建缓冲区对象
        var vertexBuffer = gl.createBuffer();

        //将缓冲区对象绑定到目标
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        //向缓冲区写入数据
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
		
		var FSIZE = vertices.BYTES_PER_ELEMENT;
		
        //获取坐标点
		var a_Position = gl.getAttribLocation(shaderProgram, "a_Position");
        //将缓冲区对象分配给a_Position变量
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE*4, 0);
        //连接a_Position变量与分配给它的缓冲区对象
        gl.enableVertexAttribArray(a_Position);

        //获取Color坐标点
        var a_TextCoord = gl.getAttribLocation(shaderProgram, "a_TextCoord");
        //将缓冲区对象分配给a_Position变量
        gl.vertexAttribPointer(a_TextCoord, 2, gl.FLOAT, false, FSIZE*4, FSIZE*2);
        //连接a_Position变量与分配给它的缓冲区对象
        gl.enableVertexAttribArray(a_TextCoord);
        return n;
    }

    function initTexture(gl, shaderProgram, n, image){
        //创建纹理对象
        var texture = gl.createTexture();
        //获取u_Sampler的存储位置
        var u_Sampler = gl.getUniformLocation(shaderProgram, 'u_Sampler');

        loadTexture(gl, n, texture, u_Sampler, image);
        return true;

    }

    function loadTexture(gl, n, texture, u_Sampler, image){
        //1.对纹理图像进行Y轴反转
        // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        //2.开启0号纹理单元
        gl.activeTexture(gl.TEXTURE0);
        //3.向target绑定纹理对象
        gl.bindTexture(gl.TEXTURE_2D, texture);

        //4.配置纹理参数
		// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        //5.配置纹理图像
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        //6.将0号纹理图像传递给着色器
        gl.uniform1i(u_Sampler, 0);
		// 清空 <canvas>
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

        //绘制矩形
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);

	}
	var program = webgl.createProgram();
	webgl.attachShader(program, vertShader);
    webgl.attachShader(program, fragShader);
    webgl.linkProgram(program);
    webgl.useProgram(program);
    return new Promise((resolve, reject) => {
        const image = offScreenCanvas.createImage();
        image.onerror = reject;
        image.onload = () => {
            const { width, height } = image;
            webgl.canvas.width = width;
            webgl.canvas.height = height;
            initTexture(webgl, program, initBuffers(webgl, program), image);
            var bitmapData = new Uint8Array(width * height * 4);
            webgl.readPixels(0, 0, width, height, webgl.RGBA, webgl.UNSIGNED_BYTE, bitmapData);
            const imageData = new Uint8ClampedArray(typedArrayToBuffer(bitmapData));
            resolve({
                width,
                height,
                imageData
            });
        };
        image.src = imagePath;
    });
}
