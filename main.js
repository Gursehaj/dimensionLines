const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas,true);

const firstPoint = new BABYLON.Vector3(0, 0, 0);
const secondPoint = new BABYLON.Vector3(2.5, 0, -2.5);
const k = 10;
var mousePos = BABYLON.Vector3.Zero();
const axis = {
    across: "across",
    x: "xAxis",
    y: "yAxis",
    z: "zAxis",
    p: "perpendicular"
};
const projectedPoints = [];
const orignalAxisPoints = new Map();
const projectedAxisPoints = new Map();
var createScene = function () {
// This creates a basic Babylon Scene object (non-mesh)
var scene = new BABYLON.Scene(engine);

// This creates and positions a free camera (non-mesh)
var camera = new BABYLON.ArcRotateCamera("camera1",  0, Math.PI/3, k, new BABYLON.Vector3(0, 0, 0), scene);

// This targets the camera to scene origin
camera.setTarget(BABYLON.Vector3.Zero());

// This attaches the camera to the canvas
camera.attachControl(canvas, true);

// This creates a light, aiming 0,1,0 - to the sky (non-mesh)
var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

const axes = new BABYLON.AxesViewer(scene, 10, null, null, null, null, 0.1);

// Default intensity is 1. Let's dim the light a small amount
light.intensity = 0.7;

// Built-in 'sphere' shape.
var origin = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 0.1, segments: 32}, scene);
origin.position = firstPoint;
var point = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 0.1, segments: 32}, scene);
point.position = secondPoint;

return scene;
};

const scene = createScene();

var mouseCursor = BABYLON.MeshBuilder.CreateSphere("mouseCursor", {diameter: 0.25, segments: 32}, scene);
var mouseCursorMat = new BABYLON.StandardMaterial("cursorMat", scene);
mouseCursor.material = mouseCursorMat;

engine.runRenderLoop(function () {
    scene.render();
}
);
window.addEventListener("resize", function () {
    engine.resize();
});

const getAxisColor = (val) =>{
    switch (val) {
        case axis.across:
            return BABYLON.Color3.Magenta();
        case axis.x:
            return BABYLON.Color3.Red();
        case axis.y:
            return BABYLON.Color3.Green();
        case axis.z:
            return BABYLON.Color3.Blue();
        default:
            return BABYLON.Color3.Black();
    }
}

const createAxisLines = () => {
    let projectionPoints = [];
    // line across the points
    let acrossLinePoints = [firstPoint, secondPoint.subtract(firstPoint).scale(2.0)];
    projectionPoints.push(acrossLinePoints);
    orignalAxisPoints.set(axis.across, acrossLinePoints);
    // let acrossLine = BABYLON.MeshBuilder.CreateLines("pointLine", {points: acrossLinePoints});
    // acrossLine.color = new BABYLON.Color3(1, 0, 1);

    // line X Axis 
    let xAxisLinePoints = [new BABYLON.Vector3(secondPoint.x - 1, secondPoint.y ,secondPoint.z), new BABYLON.Vector3(secondPoint.x + 1, secondPoint.y ,secondPoint.z)];
    projectionPoints.push(xAxisLinePoints);
    orignalAxisPoints.set(axis.x, xAxisLinePoints);
    // let xAxisLine = BABYLON.MeshBuilder.CreateLines("pointLine", {points: xAxisLinePoints});
    // xAxisLine.color = new BABYLON.Color3(1, 0, 0);

    // line Y Axis 
    let yAxisLinePoints = [new BABYLON.Vector3(secondPoint.x, secondPoint.y - 1,secondPoint.z), new BABYLON.Vector3(secondPoint.x, secondPoint.y + 1,secondPoint.z)];
    projectionPoints.push(yAxisLinePoints);
    orignalAxisPoints.set(axis.y, yAxisLinePoints);
    // let yAxisLine = BABYLON.MeshBuilder.CreateLines("pointLine", {points: yAxisLinePoints});
    // yAxisLine.color = new BABYLON.Color3(0, 1, 0);

    // line Z Axis 
    let zAxisLinePoints = [new BABYLON.Vector3(secondPoint.x, secondPoint.y,secondPoint.z - 1), new BABYLON.Vector3(secondPoint.x, secondPoint.y,secondPoint.z + 1)];
    projectionPoints.push(zAxisLinePoints);
    orignalAxisPoints.set(axis.z, zAxisLinePoints);
    // let zAxisLine = BABYLON.MeshBuilder.CreateLines("pointLine", {points: zAxisLinePoints});
    // zAxisLine.color = new BABYLON.Color3(0, 0, 1);

    let pointPlane = BABYLON.MeshBuilder.CreateGround("pointPlane", {width: k, height: k});
    pointPlane.enablePointerMoveEvents = true;
    pointPlane.position = secondPoint;
    let n = pointPlane.getNormalsData();
    const plane = new BABYLON.Plane.FromPositionAndNormal(secondPoint, new BABYLON.Vector3(n[0], n[1], n[2]));
    orignalAxisPoints.forEach((p, a) => {
            let point = calculatePointOnPlane(p[0], plane);
            createExtLines(a, point);
            // let projectionLine = BABYLON.MeshBuilder.CreateLines("pointLine", {points: [p, scene.activeCamera.position]});
    });
};

const calculatePointOnPlane = (point, plane) => {
    let pD = plane.asArray();
    let vec = point.subtract(scene.activeCamera.position);
    let t = - ((pD[0] * point.x + pD[1] * point.y + pD[2] * point.z + pD[3])/(pD[0] * vec.x + pD[1] * vec.y + pD[2] * vec.z));
    return new BABYLON.Vector3(point.x + vec.x * t, point.y + vec.y * t, point.z + vec.z * t);
};

const createExtLines = (a, point) => {
    let p1 = secondPoint.add(point.subtract(secondPoint).normalize().scale(k));
    let p2 = secondPoint.add(point.subtract(secondPoint).normalize().scale(-k));
    projectedAxisPoints.set(a, [p1, p2]);
    let l = BABYLON.MeshBuilder.CreateDashedLines("line", {points: [p1, p2]});
    l.color = getAxisColor(a);    
};

scene.onPointerMove = function (evt, pickResult) {
    if(pickResult.hit)
    {
        if (pickResult.pickedMesh.name === "pointPlane") {
            let pos = new BABYLON.Vector3(pickResult.pickedPoint.x, pickResult.pickedPoint.y, pickResult.pickedPoint.z);
            mouseCursor.position = pos;
            mousePos = pos;
            snap2Edge(pos);

        }
    }
};

const snap2Edge = (x, y, z) => {
    var nearestEdge = null;
    var previousDist = 9999999;
    projectedAxisPoints.forEach( (p, a) => {
        let dis = distanceBtwPointAndLine(mousePos, p);
        if (previousDist > dis)
        {
            previousDist = dis;
            nearestEdge = a;
        }
    });
    console.log(`Closest Edge is: ${nearestEdge}`);
    mouseCursor.material.emissiveColor = getAxisColor(nearestEdge);
};

const cleanLines = () => {
    while (scene.getNodeByName("line")){
        scene.getNodeByName("line").dispose();
    }
};

const distanceBtwPointAndLine = (p, l) => {
    let p1 = l[0];
    let p2 = l[1];
    return Math.abs((p2.x - p1.x) * (p1.z - p.z) - (p1.x - p.x) * (p2.z - p1.z))/Math.sqrt((Math.pow((p2.x - p1.x), 2) + Math.pow((p2.z - p1.z), 2)));
};

createAxisLines();

scene.onKeyboardObservable.add( keyInfo => {
    if(keyInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN)
    {
        cleanLines();
        createAxisLines();
    }
});

