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
  verticesTemp: p5.Vector[];
  canGrow: boolean[];
  vertexMagnitudes: number[];
  vertexAngles: number[];

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
    this.verticesTemp = [];
    this.canGrow = [];
    this.vertexMagnitudes = [];
    this.vertexAngles = [];
    this.initVertices(p);
  }

  initVertices(p: p5) {
    for (let angle = 0; angle < p.TWO_PI; angle += p.PI / 50) {
      let x = this.size * p.cos(angle);
      let y = this.size * p.sin(angle);
      this.vertices.push(p.createVector(x, y));
      this.verticesTemp.push(p.createVector(x, y));
      this.canGrow.push(true); // Initially, all vertices can grow
      this.vertexMagnitudes.push(this.size);
      this.vertexAngles.push(angle);
    }
  }

  updateVertices(p: p5) {
    for (let i = 0; i < this.vertices.length; i++) {
      if (this.canGrow[i]) {
        this.vertexMagnitudes[i] += 0.05; // Apply growth to the magnitude
        const x = this.vertexMagnitudes[i] * p.cos(this.vertexAngles[i]);
        const y = this.vertexMagnitudes[i] * p.sin(this.vertexAngles[i]);
        this.vertices[i].set(x, y);
      }
    }
    this.verticesTemp = this.vertices.map(v => v.copy());
  }

  update(p: p5) {
    this.position.add(this.velocity);
    this.edges(p);

    if (this.shrinking) {
      this.shrink(p);
    } else {
      this.grow(p);
    }
    this.updateVertices(p);
  }

  display(p: p5) {
    p.fill(this.color);
    p.push();
    p.translate(this.position.x, this.position.y);
    p.beginShape();
    for (let v of this.verticesTemp) {
      p.vertex(v.x, v.y);
    }
    p.endShape(p.CLOSE);
    p.pop();
  }

  edges(p: p5) {
    let hitEdge = false;
    for (let v of this.verticesTemp) {
      let x = this.position.x + v.x;
      let y = this.position.y + v.y;

      // Check horizontal edges
      if (x < 0) {
        this.position.x = Math.abs(v.x); // Adjust position to stay within bounds
        this.velocity.x = Math.abs(this.velocity.x); // Ensure velocity is directed inwards
        hitEdge = true;
      } else if (x > window.innerWidth) {
        this.position.x = window.innerWidth - Math.abs(v.x); // Adjust position to stay within bounds
        this.velocity.x = -Math.abs(this.velocity.x); // Ensure velocity is directed inwards
        hitEdge = true;
      }

      // Check vertical edges
      if (y < 0) {
        this.position.y = Math.abs(v.y); // Adjust position to stay within bounds
        this.velocity.y = Math.abs(this.velocity.y); // Ensure velocity is directed inwards
        hitEdge = true;
      } else if (y > window.innerHeight) {
        this.position.y = window.innerHeight - Math.abs(v.y); // Adjust position to stay within bounds
        this.velocity.y = -Math.abs(this.velocity.y); // Ensure velocity is directed inwards
        hitEdge = true;
      }

      if (hitEdge) break; // If any vertex hits the edge, stop checking further
    }
  }

  grow(p: p5) {
    for (let i = 0; i < this.vertices.length; i++) {
      let newMagnitude = this.vertexMagnitudes[i] + 0.05; // Simulate the growth
      let newX = this.position.x + newMagnitude * p.cos(this.vertexAngles[i]);
      let newY = this.position.y + newMagnitude * p.sin(this.vertexAngles[i]);

      // Check if the new position is within the canvas boundaries
      if (newX < 0 || newX > window.innerWidth || newY < 0 || newY > window.innerHeight) {
        this.canGrow[i] = false; // If the new position is out of bounds, stop growing this vertex
      } else {
        this.canGrow[i] = true; // Otherwise, allow it to grow
      }
    }
  }

  shrink(p: p5) {
    if (this.size > 0) {
      this.size -= 0.2;
    }
  }

  intersects(other: Particle, p: p5) {
    // Check if any vertex of this particle overlaps with any vertex of the other particle
    for (let v of this.verticesTemp) {
      let x1 = v.x;
      let y1 = v.y;

      for (let ov of other.verticesTemp) {
        let x2 = ov.x;
        let y2 = ov.y;

        if (p.dist(x1, y1, x2, y2) < 1) { // Small distance threshold for vertex overlap
          return true;
        }
      }
    }
    return false;
  }


  handleCollision(other: Particle, p: p5) {
      // Handle the collision by adjusting positions and velocities
      let d = p.dist(this.position.x, this.position.y, other.position.x, other.position.y);
      let overlap = (this.size + other.size) - d;
      this.deform(other, p);
      other.deform(this, p);

      if (overlap > 0) {
        let direction = p5.Vector.sub(this.position, other.position).normalize();
        let displacement = direction.mult(overlap / 2);
        this.position.add(displacement);
        other.position.sub(displacement);
      }
    }

  deform(other: Particle, p: p5) {
    // Perform deformation based on vertex positions
    for (let i = 0; i < this.vertices.length; i++) {
      let v = this.vertices[i];
      let x = this.position.x + v.x;
      let y = this.position.y + v.y;

      if (x > other.position.x - other.size && x < other.position.x + other.size &&
          y > other.position.y - other.size && y < other.position.y + other.size) {
        let closestVertexIndex = this.getClosestVertexIndex(other.position, p);
        let prevIndex = (closestVertexIndex - 1 + this.vertices.length) % this.vertices.length;
        let nextIndex = (closestVertexIndex + 1) % this.vertices.length;

        let prevVertex = this.vertices[prevIndex];
        let nextVertex = this.vertices[nextIndex];
        let closestVertex = this.vertices[closestVertexIndex];

        let targetX = (prevVertex.x + nextVertex.x) / 2;
        let targetY = (prevVertex.y + nextVertex.y) / 2;

        closestVertex.x = targetX;
        closestVertex.y = targetY;
        this.verticesTemp = this.vertices.map(v => v.copy());
      }
    }
  }

  getClosestVertexIndex(targetPosition: p5.Vector, p: p5) {
    let closestIndex = 0;
    let closestDist = p.dist(this.verticesTemp[0].x, this.verticesTemp[0].y, targetPosition.x - this.position.x, targetPosition.y - this.position.y);

    for (let i = 1; i < this.verticesTemp.length; i++) {
      let d = p.dist(this.verticesTemp[i].x, this.verticesTemp[i].y, targetPosition.x - this.position.x, targetPosition.y - this.position.y);
      if (d < closestDist) {
        closestDist = d;
        closestIndex = i;
      }
    }

    return closestIndex;
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