// scene variables
var scene;
var camera;
var renderer;
var light;
var container;

// controls
var controls;

// loading variables
var loadCount;
var loader;

// shaders
var fshader;
var vshader;

// object variables
var island;
var particles;

function main()
{
	// setup the scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x001155)
	camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 1000 );
	renderer = new THREE.WebGLRenderer( { canvas: islandDemoCanvas } );

	// document.body.appendChild(renderer.domElement);
	// camera.position.z = 30;
	camera.position.y = 50;

	// setup controller
	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.1;
	// controls.minAzimuthAngle = controls.maxAzimuthAngle = 0;

	// add the light
	light = new THREE.PointLight(0xffffff, 1, 1000);
	light.position.set(100, 100, 100);
	scene.add(light);

	THREE.Cache.enabled = true;
	loadCount = 0;
	loader = new THREE.FileLoader();

	loader.load('IslandGenProto/shaders/vertexShader.vert',
		function (data) 
		{
			console.log(data);
			vshader = data;
			loadCount += 1;
		},
		function (xhr) { console.log((xhr.loaded/xhr.total * 100)+ '% loaded'); },
		function (err) { console.error('An error happened');});

	loader.load('IslandGenProto/shaders/fragmentShader.frag',
		function (data) 
		{
			console.log(data);
			fshader = data;
			loadCount += 1;
		}, function (xhr) { console.log((xhr.loaded/xhr.total * 100)+ '% loaded'); },
		function (err) { console.error('An error happened'); });

	island = new Island(50, 1, 0x00ff00, 1, 0.4);
	scene.add(island.mesh);

	updateCanvas();
	
	animate();
}

function animate() 
{
	requestAnimationFrame(animate);
    if(loadCount == 2) 
	{
		controls.update();
	}
	
	if(particles !== undefined)
	{
		particles.animate();
	}

	renderer.render(scene, camera);
}

function friends()
{
	let haveFriends = document.getElementById("friends").checked;
	if(haveFriends)
	{
		particles = new Particles();
	}
	else
	{
		particles.remove();
		particles = undefined;
	}
}

function updateCanvas()
{
	let canvas = document.getElementById("islandDemoCanvas");
	
	renderer.setSize(canvas.clientWidth, canvas.clientHeight);

	camera.aspect = canvas.clientWidth / canvas.clientHeight;
	camera.updateProjectionMatrix();

}