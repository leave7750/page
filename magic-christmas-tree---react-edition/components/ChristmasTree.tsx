
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { CONFIG } from '../constants';
import { AppState, ParticleData, DustData } from '../types';

interface ChristmasTreeProps {
    appState: AppState;
    onInteract: () => void;
}

const ChristmasTree: React.FC<ChristmasTreeProps> = ({ appState, onInteract }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const composerRef = useRef<EffectComposer | null>(null);
    const mainGroupRef = useRef<THREE.Group>(new THREE.Group());
    const logicDataRef = useRef<{
        gold: ParticleData[],
        silver: ParticleData[],
        gem: ParticleData[],
        emerald: ParticleData[],
        dust: DustData[],
        star: THREE.Mesh | null
    }>({ gold: [], silver: [], gem: [], emerald: [], dust: [], star: null });

    const meshesRef = useRef<{
        gold?: THREE.InstancedMesh,
        silver?: THREE.InstancedMesh,
        gem?: THREE.InstancedMesh,
        emerald?: THREE.InstancedMesh,
        dust?: THREE.Points
    }>({});

    const dummy = new THREE.Object3D();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050505);
        scene.fog = new THREE.FogExp2(0x050505, 0.002);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraRef.current = camera;
        updateCameraPos();

        const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

        scene.add(new THREE.AmbientLight(0xffffff, 0.2));
        const spotLight = new THREE.SpotLight(0xffddaa, 100);
        spotLight.position.set(30, 80, 50);
        scene.add(spotLight);

        const renderPass = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = CONFIG.bloomThreshold;
        bloomPass.strength = CONFIG.bloomStrength;
        bloomPass.radius = CONFIG.bloomRadius;

        const composer = new EffectComposer(renderer);
        composer.addPass(renderPass);
        composer.addPass(bloomPass);
        composerRef.current = composer;

        initSceneObjects(scene);

        scene.add(mainGroupRef.current);

        const handleResize = () => {
            if (!cameraRef.current || !rendererRef.current || !composerRef.current) return;
            cameraRef.current.aspect = window.innerWidth / window.innerHeight;
            cameraRef.current.updateProjectionMatrix();
            updateCameraPos();
            rendererRef.current.setSize(window.innerWidth, window.innerHeight);
            composerRef.current.setSize(window.innerWidth, window.innerHeight);
        };

        const onPointerUp = (e: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            raycaster.setFromCamera(mouse, camera);
            const targets = Object.values(meshesRef.current).filter(m => m !== undefined) as (THREE.Object3D | THREE.InstancedMesh)[];
            if (logicDataRef.current.star) targets.push(logicDataRef.current.star);

            const intersects = raycaster.intersectObjects(targets);
            if (intersects.length > 0) {
                onInteract();
            }
        };

        window.addEventListener('resize', handleResize);
        containerRef.current.addEventListener('pointerup', onPointerUp);

        let animationFrame: number;
        let time = 0;
        const animate = () => {
            animationFrame = requestAnimationFrame(animate);
            time += 0.01;
            const isExploded = appState === AppState.EXPLODED;
            const lerpSpeed = isExploded ? 0.03 : 0.06;

            updateMeshes(isExploded, lerpSpeed);
            updateDust(isExploded, lerpSpeed);

            if (logicDataRef.current.star) {
                const target = isExploded ? (logicDataRef.current.star.userData.explosionPos as THREE.Vector3) : (logicDataRef.current.star.userData.treePos as THREE.Vector3);
                logicDataRef.current.star.position.lerp(target, lerpSpeed);
                logicDataRef.current.star.rotation.y += 0.01;
            }

            mainGroupRef.current.rotation.y += isExploded ? 0.001 : 0.004;
            composer.render();
        };
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrame);
            renderer.dispose();
            containerRef.current?.removeChild(renderer.domElement);
        };
    }, [appState]);

    function updateCameraPos() {
        if (!cameraRef.current) return;
        const aspect = window.innerWidth / window.innerHeight;
        if (aspect < 1) {
            cameraRef.current.position.set(0, 0, CONFIG.camDistance + (1 - aspect) * 100);
        } else {
            cameraRef.current.position.set(0, 0, CONFIG.camDistance);
        }
    }

    function initSceneObjects(scene: THREE.Scene) {
        const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xffaa00, metalness: 1.0, roughness: 0.15, emissive: 0xaa5500, emissiveIntensity: 0.1 });
        const silverMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.2 });
        const gemMat = new THREE.MeshPhysicalMaterial({ color: 0xff0044, metalness: 0.1, roughness: 0.0, transmission: 0.6, emissive: 0x550011, emissiveIntensity: 0.4 });
        const emeraldMat = new THREE.MeshPhysicalMaterial({ color: 0x00aa55, metalness: 0.2, roughness: 0.1, transmission: 0.5, emissive: 0x002211, emissiveIntensity: 0.3 });

        meshesRef.current.gold = createInstanced(new THREE.SphereGeometry(0.7, 8, 8), goldMat, CONFIG.goldCount, logicDataRef.current.gold);
        meshesRef.current.silver = createInstanced(new THREE.BoxGeometry(0.8, 0.8, 0.8), silverMat, CONFIG.silverCount, logicDataRef.current.silver);
        meshesRef.current.gem = createInstanced(new THREE.OctahedronGeometry(0.8, 0), gemMat, CONFIG.gemCount, logicDataRef.current.gem);
        meshesRef.current.emerald = createInstanced(new THREE.ConeGeometry(0.5, 1.2, 5), emeraldMat, CONFIG.emeraldCount, logicDataRef.current.emerald);

        const starGeo = new THREE.OctahedronGeometry(3.0, 0);
        const starMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive:0xffffee, emissiveIntensity:1.5 });
        const star = new THREE.Mesh(starGeo, starMat);
        const starTreePos = new THREE.Vector3(0, CONFIG.treeHeight/2 + 2.5, 0);
        star.userData = { treePos: starTreePos, explosionPos: new THREE.Vector3(0, 50, -30) };
        star.position.copy(starTreePos);
        mainGroupRef.current.add(star);
        logicDataRef.current.star = star;

        createDustSystem();
        createStarField(scene);
    }

    function createInstanced(geo: THREE.BufferGeometry, mat: THREE.Material, count: number, data: ParticleData[]) {
        const mesh = new THREE.InstancedMesh(geo, mat, count);
        mainGroupRef.current.add(mesh);
        for (let i = 0; i < count; i++) {
            const h = Math.random() * CONFIG.treeHeight - CONFIG.treeHeight/2;
            const normH = (h + CONFIG.treeHeight/2) / CONFIG.treeHeight;
            const rMax = CONFIG.maxRadius * (1 - normH) * 1.1; 
            const r = Math.sqrt(Math.random()) * rMax; 
            const theta = Math.random() * Math.PI * 2;
            const treePos = new THREE.Vector3(r * Math.cos(theta), h, r * Math.sin(theta));
            const explodeR = 50 + Math.random() * 30;
            const explodePos = randomSpherePoint(explodeR);
            data.push({
                treePos, explosionPos: explodePos, currentPos: treePos.clone(),
                scale: 0.5 + Math.random() * 0.9,
                rotSpeed: new THREE.Euler(Math.random()*0.02, Math.random()*0.02, 0),
                rotation: new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, 0)
            });
        }
        return mesh;
    }

    function createDustSystem() {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(CONFIG.dustCount * 3);
        for(let i=0; i<CONFIG.dustCount; i++) {
            const h = Math.random() * CONFIG.treeHeight - CONFIG.treeHeight/2;
            const r = Math.random() * CONFIG.maxRadius + 5;
            const theta = Math.random() * Math.PI * 2;
            const tx = r*Math.cos(theta), tz = r*Math.sin(theta);
            const exP = randomSpherePoint(50 + Math.random() * 40);
            logicDataRef.current.dust.push({
                treePos: new THREE.Vector3(tx, h, tz), explosionPos: exP, currentPos: new THREE.Vector3(tx, h, tz), velocity: Math.random() * 0.05 + 0.02
            });
            pos[i*3] = tx; pos[i*3+1] = h; pos[i*3+2] = tz;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const dustSystem = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffd700, size: 0.4, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending }));
        mainGroupRef.current.add(dustSystem);
        meshesRef.current.dust = dustSystem;
    }

    function createStarField(scene: THREE.Scene) {
        const geo = new THREE.BufferGeometry();
        const pos = [];
        for(let i=0; i<400; i++) pos.push((Math.random()-0.5)*600, (Math.random()-0.5)*600, (Math.random()-0.5)*600);
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        scene.add(new THREE.Points(geo, new THREE.PointsMaterial({color: 0x444444, size: 0.8})));
    }

    function randomSpherePoint(r: number) {
        const u = Math.random(), v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        return new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
    }

    function updateMeshes(isExploded: boolean, speed: number) {
        const categories = [
            { mesh: meshesRef.current.gold, data: logicDataRef.current.gold },
            { mesh: meshesRef.current.silver, data: logicDataRef.current.silver },
            { mesh: meshesRef.current.gem, data: logicDataRef.current.gem },
            { mesh: meshesRef.current.emerald, data: logicDataRef.current.emerald }
        ];

        categories.forEach(({ mesh, data }) => {
            if (!mesh) return;
            for (let i = 0; i < data.length; i++) {
                const item = data[i];
                item.currentPos.lerp(isExploded ? item.explosionPos : item.treePos, speed);
                item.rotation.x += item.rotSpeed.x;
                item.rotation.y += item.rotSpeed.y;
                dummy.position.copy(item.currentPos);
                dummy.rotation.copy(item.rotation);
                dummy.scale.setScalar(item.scale);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
        });
    }

    function updateDust(isExploded: boolean, speed: number) {
        const dust = meshesRef.current.dust;
        if (!dust) return;
        const positions = dust.geometry.attributes.position.array as Float32Array;
        for(let i=0; i<logicDataRef.current.dust.length; i++) {
            const item = logicDataRef.current.dust[i];
            if (isExploded) {
                item.currentPos.lerp(item.explosionPos, speed * 0.5);
            } else {
                item.currentPos.x += (item.treePos.x - item.currentPos.x) * speed;
                item.currentPos.z += (item.treePos.z - item.currentPos.z) * speed;
                item.currentPos.y += item.velocity;
                if(item.currentPos.y > CONFIG.treeHeight/2) item.currentPos.y = -CONFIG.treeHeight/2;
            }
            positions[i*3] = item.currentPos.x;
            positions[i*3+1] = item.currentPos.y;
            positions[i*3+2] = item.currentPos.z;
        }
        dust.geometry.attributes.position.needsUpdate = true;
    }

    return <div ref={containerRef} className="w-full h-full" />;
};

export default ChristmasTree;
