
import { ControllerCamera } from "./js/camera.js";
import { detectionSamllRectangle, detectionDocument } from "./js/fixRectangle.js";
window.addEventListener("load", () => {

  const videoWidth = 1600;
  const videoHeight = 1200;
  const streamVideo = document.getElementById("streamVideo");
  const editCanvas = document.getElementById("editCanvas");
  const saveCanvas = document.getElementById("saveCanvas");
  const fixCanvas = document.getElementById("fixCanvas");
  const editContext = editCanvas.getContext("2d");
  const snapShot = document.getElementById("snapShot");
  const rotate = document.getElementById("rotate");
  const correction = document.getElementById("correction");
  const reset = document.getElementById("reset")
  const CAMERA = new ControllerCamera(streamVideo, videoWidth, videoHeight);

  let degree = 0;
  let pauseCanvas = false;
  let cvMat = {
    cap: null,
    srcDst: null,
    calcDst: null,
    drawDst: null
  }
  let boundRectData = {
    refreshBoundRectInfo: {},
    saveBoundRectInfo: {},
    backupBoundRectInfo: {}
  }
  let circleCompoentInfo = {
    radius: 40,
    lineWidth: 1,
    lineStrokeStyle: "blue",
    circleStrokeStyle: "rgba(255, 255, 255, 0.5)",
    circleFillStyle: "rgba(255, 255, 255, 0.7)"
  };

  async function startUpCamera(deviceId) {
    if (!deviceId) {
      deviceId = CAMERA.currentDeviceId
    }

    CAMERA.webcam.width = CAMERA.videoWidth;
    CAMERA.webcam.height = CAMERA.videoHeight;

    await CAMERA.stopStream().catch(err => console.log(err));
    await CAMERA.getStream(deviceId)
    await CAMERA.handleStream(CAMERA.webcam, CAMERA.mediaStream);

    return true
  }

  async function initCamera() {
    let devices = await CAMERA.getDeviceList()

    await startUpCamera();

    // frist access camera is reload
    if (devices.length === 1 && devices[0] === "") {
      await CAMERA.stopStream();
      await CAMERA.getDeviceList() // frist access camera
      await CAMERA.getStream(CAMERA.currentDeviceId)
      await CAMERA.handleStream(CAMERA.webcam, CAMERA.mediaStream);
    }

    return true
  }

  function rotateDst(dst) {
    switch (degree) {
      case 0:
        // ?????????????????????
        break;
      case 90:
        cv.flip(dst, dst, 0);
        cv.transpose(dst, dst);
        break;
      case 180:
        cv.flip(dst, dst, 1);
        cv.flip(dst, dst, 0);
        break;
      case 270:
        cv.flip(dst, dst, 1);
        cv.transpose(dst, dst);
        break;
      default:
        // ?????????????????????
        break;
    }
  }

  function drawSmallRectangle(dst, rectPoint) {
    let red = new cv.Scalar(255, 0, 50, 255);
    let green = new cv.Scalar(50, 255, 0, 255);

    // ?????????????????????
    rectPoint = boundRectInfo["bigRect"]["point"];
    // ??????
    let point1 = new cv.Point(rectPoint[0]['x'], rectPoint[0]['y']);
    let point2 = new cv.Point(rectPoint[1]['x'], rectPoint[1]['y']);
    let point3 = new cv.Point(rectPoint[2]['x'], rectPoint[2]['y']);
    let point4 = new cv.Point(rectPoint[3]['x'], rectPoint[3]['y']);

    //?????????
    cv.line(dst, point1, point2, red, 4, cv.LINE_AA, 0)
    cv.line(dst, point1, point4, red, 4, cv.LINE_AA, 0)
    cv.line(dst, point3, point2, red, 4, cv.LINE_AA, 0)
    cv.line(dst, point3, point4, red, 4, cv.LINE_AA, 0)

    // ????????????
    cv.circle(dst, point1, 6, red, 12, cv.FILLED, 0)
    cv.circle(dst, point2, 6, red, 12, cv.FILLED, 0)
    cv.circle(dst, point3, 6, red, 12, cv.FILLED, 0)
    cv.circle(dst, point4, 6, red, 12, cv.FILLED, 0)

  }

  function canvasStart() {
    if (cvMat.cap) cvMat.cap = null;
    if (cvMat.srcDst) cvMat.srcDst.delete();
    if (cvMat.calcDst) cvMat.calcDst.delete();
    if (cvMat.drawDst) cvMat.drawDst.delete();

    let canvasWidth = videoWidth;
    let canvasHeight = videoHeight;

    if (canvasHeight / canvasWidth == 0.5625) {
      if (canvasWidth < 1280) {
        canvasWidth = 1280
      }
      if (canvasHeight < 720) {
        canvasHeight = 720
      }
    }

    if (canvasHeight / canvasWidth == 0.75) {
      if (canvasWidth < 1024) {
        canvasWidth = 1024
      }
      if (canvasHeight < 768) {
        canvasHeight = 768
      }
    }

    streamVideo.width = canvasWidth;
    streamVideo.height = canvasHeight;
    pauseCanvas = false;

    const showCanvas = function () {

      cvMat.cap = new cv.VideoCapture(streamVideo); // ?????????
      cvMat.srcDst = new cv.Mat(canvasHeight, canvasWidth, cv.CV_8UC4); // ???????????????
      cvMat.calcDst = new cv.Mat(canvasHeight, canvasWidth, cv.CV_8UC1); // ??????????????????
      cvMat.drawDst = new cv.Mat(canvasHeight, canvasWidth, cv.CV_8UC4, new cv.Scalar(255, 0, 255, 0)); // ??????????????????

      const drawCanvas = function () {
        const begin = Date.now();

        cvMat.cap.read(cvMat.srcDst); //

        cvMat.srcDst.copyTo(cvMat.drawDst); // ??????????????? drawDst

        cv.cvtColor(cvMat.srcDst, cvMat.calcDst, cv.COLOR_RGBA2GRAY);

        rotateDst(cvMat.calcDst);

        rotateDst(cvMat.drawDst);

        if (degree === 90 || degree === 270) {
          boundRectData.refreshBoundRectInfo = detectionDocument(cvMat.calcDst, cvMat.drawDst, videoHeight, videoWidth)
        } else {
          boundRectData.refreshBoundRectInfo = detectionDocument(cvMat.calcDst, cvMat.drawDst, videoWidth, videoHeight)
        }

        // const saveDst = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC4);
        // cvMat.srcDst.copyTo(saveDst);
        // rotateDst(saveDst);
        // cv.imshow('saveCanvas', saveDst);
        // rendererEditCompoent(boundRectData.refreshBoundRectInfo, editContext);
        // documentScanner(boundRectData.refreshBoundRectInfo, "saveCanvas", "fixCanvas");
        // saveDst.delete();

        cv.imshow('drawOutput', cvMat.drawDst);

        if (pauseCanvas === true) {
          clearTimeout(window.processVideoCanvasID);
          return false;
        }

        let timer = (1000 / 30) - (Date.now() - begin);

        if (pauseCanvas === false) {
          window.processVideoCanvasID = setTimeout(() => {
            drawCanvas();
          }, timer)
        }
      }

      drawCanvas();
    }

    showCanvas();
  }

  function calcBoundRectSize(boundRectInfo) {
    let points = boundRectInfo["bigRect"]["point"];
    let totalX = [], totalY = [], centerX = 0, centerY = 0;
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      centerX += point['x'];
      centerY += point['y'];
      totalX.push(point['x']);
      totalY.push(point['y']);
    }

    //?????????????????????????????????x y??????
    let leftTopX = Math.min(...totalX);
    let leftTopY = Math.min(...totalY);
    //?????????????????????????????????x y??????
    let rightBottomX = Math.max(...totalX);
    let rightBottomY = Math.max(...totalY);
    //????????????????????????
    let width = rightBottomX - leftTopX;
    let height = rightBottomY - leftTopY;
    centerX = centerX / points.length;
    centerY = centerY / points.length;

    // ????????????
    const newPoints = points.map(({ x, y }) => {
      return {
        x, y, angle: Math.atan2(y - centerY, x - centerX) * 180 / Math.PI
      }
    });

    // ??????????????????
    // newPoints.sort((a, b) => a.angle - b.angle)

    boundRectInfo["bigBoundingRect"] = {
      x: leftTopX,
      y: leftTopY,
      width: width,
      height: height
    }
    boundRectInfo["bigRect"]["center"] = {
      x: centerX,
      y: centerY
    }
    boundRectInfo["bigRect"]["point"] = newPoints;

    return boundRectInfo;
  }

  // ?????????????????????????????????
  function rendererEditCompoent(boundRectInfo, editContext) {
    const radius = (circleCompoentInfo.radius + (circleCompoentInfo.lineWidth / 2));

    if (editCanvas.width != boundRectInfo.naturalWidth) {
      editCanvas.width = boundRectInfo.naturalWidth;
      editCanvas.height = boundRectInfo.naturalHeight;
    }

    editContext.clearRect(0, 0, editCanvas.width, editCanvas.height);

    boundRectInfo = calcBoundRectSize(boundRectInfo);

    const drawBoundRect = () => {
      // ?????????????????????
      let boundPoint = new cv.Point(boundRectInfo["bigBoundingRect"].x, boundRectInfo["bigBoundingRect"].y);
      let boundSize = {
        width: boundRectInfo["bigBoundingRect"].width,
        height: boundRectInfo["bigBoundingRect"].height
      }

      // ????????????????????????
      editContext.beginPath();
      editContext.lineWidth = "6";
      editContext.strokeStyle = "blue";
      editContext.rect(boundPoint.x, boundPoint.y, boundSize.width, boundSize.height);
      editContext.stroke();
    }

    const drawRect = () => {
      const points = boundRectInfo["bigRect"]["point"];

      let point1 = new cv.Point(points[0]['x'], points[0]['y']);
      let point2 = new cv.Point(points[1]['x'], points[1]['y']);
      let point3 = new cv.Point(points[2]['x'], points[2]['y']);
      let point4 = new cv.Point(points[3]['x'], points[3]['y']);

      //?????????
      editContext.beginPath();
      editContext.lineWidth = "6";
      editContext.strokeStyle = "red";
      editContext.moveTo(point1.x, point1.y);
      editContext.lineTo(point2.x, point2.y);
      editContext.moveTo(point1.x, point1.y);
      editContext.lineTo(point4.x, point4.y);
      editContext.moveTo(point3.x, point3.y);
      editContext.lineTo(point2.x, point2.y);
      editContext.moveTo(point3.x, point3.y);
      editContext.lineTo(point4.x, point4.y);
      editContext.stroke();

    }

    const drawCircle = () => {
      // ????????????????????????
      const points = boundRectInfo["bigRect"]["point"];

      editContext.lineWidth = circleCompoentInfo.lineWidth; // ?????????????????????
      editContext.strokeStyle = circleCompoentInfo.circleStrokeStyle; // ?????????????????????
      editContext.fillStyle = circleCompoentInfo.circleFillStyle; // ?????????????????????

      // ????????????????????????
      for (let i = 0; i < points.length; i++) {
        const point = points[i];

        editContext.beginPath();
        editContext.arc(point['x'], point['y'], radius, 0, 2 * Math.PI, false);
        editContext.fill();
        editContext.stroke();
      }

    }

    drawBoundRect();
    drawRect();
    drawCircle();
  }

  // ???????????????????????????
  function subscribeEditCompoentEvent(editCanvas, boundRectInfo) {

    const radius = (circleCompoentInfo.radius + (circleCompoentInfo.lineWidth / 2));
    let hold = false;
    let holdCircleIndex = null;

    // ?????????????????????canvas?????????????????????
    const getRealOffsetValue = (event) => {
      let ratio = editCanvas.width / editCanvas.clientWidth;
      let offsetX = event.offsetX;
      let offsetY = event.offsetY;
  
      offsetX = (offsetX * ratio).toFixed(2);
      offsetY = (offsetY * ratio).toFixed(2);
  
      return {offsetX: parseFloat(offsetX), offsetY: parseFloat(offsetY)};
    }

    // ??????????????????????????????????????????????????????????????????????????????
    const checkAnyPointsIsInCircle = (offsetX, offsetY, boundRectInfo, radius) => {
      let inCircle = false, inCircleIndex = null;
      let points = boundRectInfo["bigRect"]["point"];
  
      const checkPointIsInCircle = (x, y, center, radius) => {
        const distance = Math.sqrt(Math.pow(x - center['x'], 2) + Math.pow(y - center['y'], 2));
        if (distance < radius) {
          console.log(distance < radius)
          return true;
        } else {
          return false;
        }
      }
  
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        // ??????????????????????????????????????????
        let isInCircle = checkPointIsInCircle(offsetX,offsetY,point,radius);
        if (isInCircle) {
          inCircle = true;
          inCircleIndex = i;
        }
      }

      return {inCircle: inCircle, inCircleIndex: inCircleIndex};
    }

    // ???????????????????????????????????????????????????
    const updateOffsetValueToBoundInfo = (newX, newY, index, boundRectInfo) => {
      if (typeof newX == "string" || typeof newY == "string") {
        newX = parseFloat(parseFloat(newX).toFixed(2));
        newY = parseFloat(parseFloat(newY).toFixed(2));
      }
      const { isOverLine: isOverLine, newX: updateX, newY: updateY } = checkPointPosition(newX, newY, index, boundRectInfo);
      if (isOverLine) {
        newX = updateX;
        newY = updateY;
      }
      boundRectInfo["bigRect"]["point"][index].x = newX;
      boundRectInfo["bigRect"]["point"][index].y = newY;
    }

    // ??????????????????????????????????????????
    // ???????????????????????????
    const checkPointPosition = (offsetX, offsetY, index, boundRectInfo) => {
      let point1;
      let point2;
      let isOverLine = false;
      switch (index) {
        case 0:
          point1 = boundRectInfo["bigRect"]["point"][1];
          point2 = boundRectInfo["bigRect"]["point"][3];
          break
        case 1:
          point1 = boundRectInfo["bigRect"]["point"][0];
          point2 = boundRectInfo["bigRect"]["point"][2];
          break
        case 2:
          point1 = boundRectInfo["bigRect"]["point"][1];
          point2 = boundRectInfo["bigRect"]["point"][3];
          break
        case 3:
          point1 = boundRectInfo["bigRect"]["point"][0];
          point2 = boundRectInfo["bigRect"]["point"][2];
          break
      }
      // ????????????????????????????????????????????????
      let overLine = ((point1.x - point2.x) * (offsetY - point2.y)) - ((point1.y - point2.y) * (offsetX - point2.x));
      // ??????????????????????????????
      let m = (point2.y - point1.y) / (point2.x - point1.x);
      // ??????(offsetx,offsety) ?????????????????????(?????????m?????????) ????????????(x,y)
      let newX = (offsetY - point1.y + m * point1.x + offsetX / m) / (m + 1.0 / m);
      let newY = point1.y + m * (newX - point1.x);
      
      if (index === 0 || index === 3) {
        if (overLine > 0) {
          isOverLine = true;
          offsetX = newX;
          offsetY = newY;
          // console.log("??????")
        } else {
          isOverLine = false;
        }
      } else {
        if (overLine < 0) {
          isOverLine = true;
          offsetX = newX;
          offsetY = newY;
          // console.log("??????")
        } else {
          isOverLine = false;
        }
      }
  
      return {isOverLine: isOverLine, newX: offsetX, newY: offsetY};
    }

    editCanvas.onmousedown = (event) => {
      let { offsetX: offsetX, offsetY: offsetY } = getRealOffsetValue(event);
      let { inCircle: inCircle, inCircleIndex: inCircleIndex } = checkAnyPointsIsInCircle(offsetX, offsetY, boundRectInfo, radius);
      
      console.log(inCircle,inCircleIndex)
      if (inCircle === true) {
        pauseCanvas = true;
        holdCircleIndex = inCircleIndex;
        editCanvas.style.cursor = "pointer";
        hold = true;
      }
    }

    editCanvas.onmousemove = (event) => {
      let { offsetX: offsetX, offsetY: offsetY } = getRealOffsetValue(event);
      let { inCircle: inCircle } = checkAnyPointsIsInCircle(offsetX, offsetY, boundRectInfo, radius);

      if (inCircle) {
        editCanvas.style.cursor = "pointer";
      } else {
        editCanvas.style.cursor = "default";
      }

      if (hold) {
        pauseCanvas = true;
        updateOffsetValueToBoundInfo(offsetX, offsetY, holdCircleIndex, boundRectInfo);
        rendererEditCompoent(boundRectInfo, editContext);
      }

    }

    editCanvas.onmouseup = (event) => {
      if (pauseCanvas === true) {
        canvasStart();
      }
      if (hold === true) {
        let { offsetX: offsetX, offsetY: offsetY } = getRealOffsetValue(event);
        updateOffsetValueToBoundInfo(offsetX, offsetY, holdCircleIndex, boundRectInfo);
        rendererEditCompoent(boundRectInfo, editContext);
      }
      hold = false;
      editCanvas.style.cursor = "default";
    }

    editCanvas.onmouseleave = (event) => {
      hold = false;
      if (pauseCanvas === true) {
        canvasStart();
      }
      editCanvas.style.cursor = "default";
    }

  }

  // ?????????????????????????????????????????????
  function warpPerspective(srcCanvas, boundRectInfo) {
    const rect = boundRectInfo["bigBoundingRect"];
    const points = boundRectInfo["bigRect"]["point"];
    const srcDst = cv.imread(srcCanvas); // ??????
    const cutDst = srcDst.roi(rect); // ??????????????????
    const fixDst = new cv.Mat(); // ?????????????????????????????????
    let cutPoints = [];

    for (let index = 0; index < points.length; index++) {
      //????????????????????????
      cutPoints.push(points[index]["x"] - rect.x);
      cutPoints.push(points[index]["y"] - rect.y);
    }

    const dsize = new cv.Size(rect.width, rect.height);

    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, cutPoints);
    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0,
      0,
      rect.width,
      0,
      rect.width,
      rect.height,
      0,
      rect.height,
    ]);

    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    cv.warpPerspective(
      cutDst,
      fixDst,
      M,
      dsize,
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar()
    );

    cutPoints = [];
    M.delete();
    srcTri.delete();
    dstTri.delete();
    srcDst.delete();
    cutDst.delete();
    return fixDst;
  }

  // ????????????
  function documentScanner(boundRectInfo) {
    fixCanvas.width = boundRectInfo["bigBoundingRect"].width;
    fixCanvas.height = boundRectInfo["bigBoundingRect"].height;
    const fixDst = warpPerspective(saveCanvas, boundRectInfo)

    getSmallSizeRectangle(fixDst);

    cv.imshow('fixCanvas', fixDst);
    fixDst.delete();
  }

  // ??????????????????
  function getSmallSizeRectangle(srcDst) {
    let calcDst = new cv.Mat();

    // const borderRect = { x: 0, y: 0, width: videoWidth, height: videoHeight };
    // const borderRect1 = new cv.Point(borderRect.x, borderRect.y);
    // const borderRect2 = new cv.Point(borderRect.width, borderRect.height);
    // cv.rectangle(srcDst, borderRect1, borderRect2, new cv.Scalar(255, 255, 255, 255), 2, cv.LINE_AA, 0);

    cv.cvtColor(srcDst, calcDst, cv.COLOR_RGBA2GRAY);

    // detectionDocument(calcDst, srcDst, srcDst.cols, srcDst.rows);
    let detection_result_point = detectionSamllRectangle(calcDst, srcDst, srcDst.cols, srcDst.rows);

    // console.log(detection_result_point)

    // setTimeout(() => {
    //   cv.imshow('fixCanvas', calcDst);
    //   calcDst.delete();
    // }, 3000);

    calcDst.delete();
  }

  // ??????????????????
  function displayEditCompoent() {
    // ???????????????canvas
    const saveDst = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC4);
    cvMat.srcDst.copyTo(saveDst);
    rotateDst(saveDst);
    cv.imshow('saveCanvas', saveDst);

    // ?????????????????????canvas???
    rendererEditCompoent(boundRectData.saveBoundRectInfo, editContext);

    saveDst.delete();
  }

  snapShot.onclick = () => {
    // ????????????????????????
    boundRectData.saveBoundRectInfo = Object.assign({}, boundRectData.refreshBoundRectInfo);
    // ????????????????????????
    boundRectData.backupBoundRectInfo = JSON.parse(JSON.stringify(boundRectData.saveBoundRectInfo));
    displayEditCompoent();
    subscribeEditCompoentEvent(editCanvas, boundRectData.saveBoundRectInfo);
  }

  reset.onclick = () => {
    // ?????????????????????
    boundRectData.saveBoundRectInfo = JSON.parse(JSON.stringify(boundRectData.backupBoundRectInfo));
    rendererEditCompoent(boundRectData.saveBoundRectInfo, editContext);
    subscribeEditCompoentEvent(editCanvas, boundRectData.saveBoundRectInfo);
  }

  rotate.onclick = () => {
    degree = degree + 90;
    if (degree === 360) {
      degree = 0;
    }
  }

  correction.onclick = () => {
    documentScanner(boundRectData.saveBoundRectInfo, "saveCanvas", "fixCanvas");
  }

  initCamera().then(() => {
    canvasStart();
  }).catch(err => console.log(err));

});