class Particles
{
    constructor()
    {
        // particle parameters
        this.maxVelocity = .4;
        this.playArea = {x: 170, y: 80, z: 120};
        this.senseDistance = 10;
        this.sepWeight = 2;
        this.alignWeight = 1.5;
        this.cohesWeight = 2;
        this.maxHue = 280;
        this.totalWeight = this.sepWeight + this.alignWeight + this.cohesWeight;
        this.maxForce = .02;

        this.particles = []
        this.geo = new THREE.Geometry()
        for(let i=0; i<250; i++) 
            {
            const particle = {
                position: new THREE.Vector3(
                    Math.random() * this.playArea.x - this.playArea.x / 2,
                    Math.random() * this.playArea.y - this.playArea.y / 2,
                    Math.random() * this.playArea.z - this.playArea.z / 2),
                velocity: new THREE.Vector3(
                    Math.random() * 2 - 1,
                    Math.random() * 2 - 1,
                    Math.random() * 2 - 1).clampLength(-this.maxVelocity, this.maxVelocity),
                acceleration: new THREE.Vector3(0,0,0),
                index: this.geo.vertices.length,
                hue: this.maxHue,
                neighborWeight: 0
            }
            this.particles.push(particle);
            this.geo.vertices.push(particle.position);
            this.geo.colors.push(new THREE.Color("hsl(" + particle.hue +", 100%, 50%)"));
        }

        this.mat = new THREE.PointsMaterial({vertexColors: true ,size: 0.5});
        this.mesh = new THREE.Points(this.geo, this.mat);
        this.mesh.position.z = -4;
        scene.add(this.mesh);

        this.clock = new THREE.Clock(true);
        this.dt;

        this.neighbors;
    }

    animate()
    {
        this.dt = this.clock.getDelta();
        this.particles.forEach(p => {
            this.updateBehavior(p);
            p.velocity.add(p.acceleration);
            p.position.add(p.velocity);
            this.wrapBounds(p);
        });
        this.mesh.geometry.verticesNeedUpdate = true;
        this.mesh.geometry.colorsNeedUpdate = true;
        // requestAnimationFrame(animate);
        // renderer.render(scene, camera);
    }

    remove()
    {
        scene.remove(this.mesh);
    }
    
    updateBehavior(particle)
    {
        this.neighbors = this.getNeighbors(particle);
        let desiredDirection = new THREE.Vector3(particle.velocity.x, particle.velocity.y, particle.velocity.z);
        if(this.neighbors.length > 0)
        {
            desiredDirection.add(this.separation(particle).multiplyScalar(this.sepWeight));
            desiredDirection.add(this.cohesion(particle).multiplyScalar(this.cohesWeight));
            desiredDirection.add(this.alignment(particle).multiplyScalar(this.alignWeight));
        }

        if(this.totalWeight > 0)
        {
            desiredDirection.divideScalar(this.totalWeight);
            desiredDirection.divideScalar(desiredDirection.length());
            desiredDirection.multiplyScalar(this.maxVelocity);
        }

        let desiredForce = new THREE.Vector3(desiredDirection.x, desiredDirection.y, desiredDirection.z);
        desiredForce.sub(particle.velocity);
        desiredForce.clampLength(0.0, this.maxForce);
        this.hueMatch(particle);

        particle.velocity.add(desiredForce);
    }

    separation(particle)
    {
        let desiredDirection = new THREE.Vector3(0,0,0);
        let shortestDist = this.senseDistance;

        this.neighbors.forEach(n =>
        {
            let dist = particle.position.distanceTo(n.position);
            if(dist < shortestDist)
            {
                shortestDist = dist;
            }
            let newDir = new THREE.Vector3(particle.position.x, particle.position.y, particle.position.z);
            newDir.sub(n.position);
            newDir.multiplyScalar(newDir.length());
            newDir.divideScalar(dist);
            desiredDirection.add(newDir);
        });
        desiredDirection.divideScalar(this.neighbors.length);

        let urgency = (this.senseDistance - shortestDist) / this.senseDistance;
        desiredDirection.divideScalar(desiredDirection.length()).multiplyScalar(urgency);

        return desiredDirection;
    }

    alignment(particle)
    {
        let desiredDirection = new THREE.Vector3(0,0,0);
        let shortestDist = this.senseDistance;
        this.neighbors.forEach(n =>
        {
            let dist = particle.position.distanceTo(n.position);
            if(dist < shortestDist)
            {
                shortestDist = dist;
            }
            desiredDirection.add(n.velocity);
        });
        desiredDirection.divideScalar(this.neighbors.length);

        let urgency = (this.senseDistance - shortestDist) / this.senseDistance;
        desiredDirection.divideScalar(desiredDirection.length()).multiplyScalar(urgency);

        return desiredDirection;
    }

    cohesion(particle)
    {
        let newPosition = new THREE.Vector3(0,0,0);

        this.neighbors.forEach(n =>
        {
            newPosition.add(n.position);
        });
        newPosition.divideScalar(this.neighbors.length);

        let desiredDirection = new THREE.Vector3(newPosition.x, newPosition.y, newPosition.z);
        desiredDirection.sub(particle.position);
        let dist = newPosition.distanceTo(particle.position);
        particle.neighborWeight = dist / this.senseDistance;
        let urgency = (this.senseDistance - dist) / this.senseDistance;
        desiredDirection.divideScalar(desiredDirection.length()).multiplyScalar(urgency);

        return desiredDirection;
    }

    hueMatch(particle)
    {
        // var newHue = neighbors.length / hueMax;
        // if(newHue > 1)
        // {
        //     newHue = 1;
        // }
        // newHue = (1 - newHue) * 200;

        if(this.neighbors.length > 0)
        {
            particle.hue = particle.neighborWeight * this.maxHue;
        }
        else
        {
            particle.hue = this.maxHue;
        }
        this.mesh.geometry.colors[particle.index] = new THREE.Color("hsl(" + particle.hue +", 100%, 50%)");
    }

    wrapBounds(particle)
    {
        if(particle.position.x > this.playArea.x / 2) // escaped right bounds
        {
            particle.position.x = -this.playArea.x / 2;
        }
        else if(particle.position.x < -this.playArea.x / 2) // escaped left bounds
        {
            particle.position.x = this.playArea.x / 2;
        }
        if(particle.position.y > this.playArea.y / 2) // escaped top bounds
        {
            particle.position.y = -this.playArea.y / 2;
        }
        else if(particle.position.y < -this.playArea.y / 2) // escaped bottom bounds
        {
            particle.position.y = this.playArea.y / 2;
        }
        if(particle.position.z > this.playArea.z / 2) // escaped back bounds
        {
            particle.position.z = -this.playArea.z / 2;
        }
        else if(particle.position.z < -this.playArea.z / 2) // escaped front bounds
        {
            particle.position.z = this.playArea.z / 2;
        }
    }

    getNeighbors(particle)
    {
        this.neighbors = [];
        for(var i = 0; i < this.particles.length; ++i)
        {
            if(particle.position.distanceTo(this.particles[i].position) < this.senseDistance && particle != this.particles[i])
            {
                this.neighbors.push(this.particles[i]);
            }
        }
        return this.neighbors;
    }
}
