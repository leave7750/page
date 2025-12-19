
import { Vector3, Euler } from 'three';

export enum AppState {
    TREE = 'tree',
    EXPLODED = 'exploded'
}

export interface ParticleData {
    treePos: Vector3;
    explosionPos: Vector3;
    currentPos: Vector3;
    scale: number;
    rotSpeed: Euler;
    rotation: Euler;
}

export interface DustData {
    treePos: Vector3;
    explosionPos: Vector3;
    currentPos: Vector3;
    velocity: number;
}

export interface Bubble {
    id: number;
    text: string;
    left: string;
    top: string;
    duration: string;
}
