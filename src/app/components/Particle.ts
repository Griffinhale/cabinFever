// src/app/components/Particle.ts
import p5 from 'p5';

export class Particle {
  position: p5.Vector;
  size: number;
  maxSize: number;
  color: p5.Color;
  velocity: p5.Vector;
  shrinking: boolean;
  velocityReversed: boolean;
  collisionFrames: number;
  vertices: p5.Vector[];
  canGrow: boolean[];
  vertexMagnitudes: number[];
  vertexAngles: number[];
  largestMag: number;
  smallestMag: number;

  constructor(x: number, y: number, p: p5) {
    this.position = p.createVector(x, y);
    this.size = 1;
    this.maxSize = p.random(20, 50);
    this.color = p.color(p.random(255), p.random(255), p.random(255), 150);
    this.velocity = p.createVector(p.random(-0.25, 0.25), p.random(-0.25, 0.25));
    this.shrinking = false;
    this.velocityReversed = false;
    this.collisionFrames = 0;
    this.vertices = [];
    this.canGrow = [];
    this.vertexMagnitudes = [];
    this.vertexAngles = [];
    this.largestMag = 0;
    this.smallestMag = 0;
    this.initVertices(p);
  }

  initVertices(p: p5) {
    for (let angle = 0; angle < p.TWO_PI; angle += p.PI / 50) {
      let x = this.size * p.cos(angle);
      let y = this.size * p.sin(angle);
      this.vertices.push(p.createVector(x, y));
      this.canGrow.push(true); // Initially, all vertices can grow
      this.vertexMagnitudes.push(this.size);
      this.vertexAngles.push(angle);
    }
  }


  update(p: p5) {
    //this.position.add(this.velocity);
    
    if (this.shrinking) {
      this.shrink(p);
    } else {
      this.grow(p);
    }
  }

  display(p: p5) {
    p.fill(this.color);
    p.push();
    p.translate(this.position.x, this.position.y);
    p.beginShape();
    for (let v of this.vertices) {
      p.vertex(v.x, v.y);
    }
    p.endShape(p.CLOSE);
    p.pop();
  }
  edges(p: p5, i: number) {
    let hittingEdge = true;
    let k = -1;
    i+=(k*-1);
    while (hittingEdge){
      let newMagnitude = this.vertexMagnitudes[i] + 0.05; // Simulate the growth
      let newX = this.position.x + newMagnitude * p.cos(this.vertexAngles[i]);
      let newY = this.position.y + newMagnitude * p.sin(this.vertexAngles[i]);
      hittingEdge = false;
      if (newX <= 0){
        this.vertices[i].x=0;
        this.canGrow[i] = false;
        hittingEdge = true;
      } else if( newX >= p.width ){
        this.vertices[i].x=p.width-1;
        this.canGrow[i] = false;
        hittingEdge = true;
      } else if (newY <= 0 ){
        this.vertices[i].y=0;
        this.canGrow[i] = false;
        hittingEdge = true;
      } else if (newY >= p.height) {
        this.vertices[i].y=p.height-1;
        this.canGrow[i] = false;
        hittingEdge = true; // If the new position is out of bounds, stop growing this vertex
      } 
      k>0?k++:k--;
      k*=-1;
      i+=k;
    }
    

    return i;
  }
  grow(p: p5) {
    this.smallestMag = 0;
    this.largestMag = 0;
    for (let i = 0; i < this.vertices.length; i++) {
      if (this.canGrow[i]) {
        let newMagnitude = this.vertexMagnitudes[i] + 0.05; // Simulate the growth
        let newX = this.position.x + newMagnitude * p.cos(this.vertexAngles[i]);
        let newY = this.position.y + newMagnitude * p.sin(this.vertexAngles[i]);

        // Check if the new position is within the canvas boundaries
        if (newX <= 0 || newX >= p.width || newY <= 0 || newY >= p.height){
          this.edges(p, i);
        } else {
          this.vertexMagnitudes[i] = newMagnitude; // Apply growth to the magnitude
          const x = this.vertexMagnitudes[i] * p.cos(this.vertexAngles[i]);
          const y = this.vertexMagnitudes[i] * p.sin(this.vertexAngles[i]);
          this.vertices[i].set(x, y);
        }
        if (this.vertexMagnitudes[i] > this.largestMag){
        this.largestMag = this.vertexMagnitudes[i];
        }
        if (this.vertexMagnitudes[i] < this.smallestMag || this.smallestMag == 0){
        this.smallestMag = this.vertexMagnitudes[i];
        }
      }
    }
  }

  shrink(p: p5) {
    this.smallestMag = 0;
    this.largestMag = 0;
    for (let i = 0; i < this.vertices.length; i++) {
        this.vertexMagnitudes[i] -= .05; // Apply growth to the magnitude
        const x = this.vertexMagnitudes[i] * p.cos(this.vertexAngles[i]);
        const y = this.vertexMagnitudes[i] * p.sin(this.vertexAngles[i]);
        this.vertices[i].set(x, y);
      if (this.vertexMagnitudes[i] > this.largestMag){
        this.largestMag = this.vertexMagnitudes[i];
      }
      if (this.vertexMagnitudes[i] < this.smallestMag || this.smallestMag == 0){
        this.smallestMag = this.vertexMagnitudes[i];
      }
    }
    if (this.smallestMag <= 0){
      this.size = 0;
    }
    }
  

    intersects(other: Particle): boolean {
      const distance = this.position.dist(other.position);
      const maxDist = this.largestMag + other.largestMag;
      return distance < maxDist;
    }


    handleCollision(other: Particle, p: p5) {
      if (!this.intersects(other)) return;
    
      console.log("intersection");
    
      // Perform detailed vertex-based collision detection
      let foundCollision = false;
      for (let [index, v] of this.vertices.entries()) {
        let x1 = this.position.x + v.x;
        let y1 = this.position.y + v.y;
    
        for (let [index2, ov] of other.vertices.entries()) {
          let x2 = other.position.x + ov.x;
          let y2 = other.position.y + ov.y;
    
          if (p.dist(x1, y1, x2, y2) < 1) {
            this.canGrow[index] = false;
            other.canGrow[index2] = false;
            foundCollision = true;
          }
            var j = index2;
            var k = 0;
          while (foundCollision){
            j=(j+(k*-1));
            k++;
            x1 = other.position.x + other.vertices[index].x;
            y1 = other.position.y + other.vertices[index].y;
            x2 = other.position.x + other.vertices[index2].x;
            y2 = other.position.y + other.vertices[index2].y;
            foundCollision = false;
            if (p.dist(x1, y1, x2, y2) < 1) {
              this.canGrow[index] = false;
              other.canGrow[index2] = false;
              foundCollision = true;
            }
          }
          return;
        }
      }
    
    }

  startShrinking() {
    this.shrinking = true;
    if (!this.velocityReversed) {
      this.reverseVelocity();
      this.velocityReversed = true;
    }
  }

  stopShrinking() {
    this.shrinking = false;
    if (this.velocityReversed) {
      this.reverseVelocity();
      this.velocityReversed = false;
    }
  }

  reverseVelocity() {
    this.velocity.mult(-1);
  }
}