class Island
{
    constructor(size, unitWidth, color, falloff, cutoff)
    {
        this.width = size * 2;
        this.height = Math.ceil(size / (Math.sqrt(3) / 2));
        this.unitWidth = unitWidth;
        this.unitHeight = (Math.sqrt(3) / 2) * this.unitWidth;
        this.maxHeight = 0; // highest possible point on island
        this.falloff = falloff;     // height falloff with distance from center
        this.cutoff = cutoff;     // max height to round to zero and create edge
        this.offset = new THREE.Vector3(-size * this.unitWidth / 2, -this.height * this.unitHeight / 2, 0);

        // noise params
        for(let i = 1; i <= 3; ++i)
        {
            this.ChangeSeed(i);
            this.ChangeScale(i);
            this.ChangeZoom(i);
        }

        this.scaleTotal = this.scale1 + this.scale2 + this.scale3;
        
        this.ResetBuffers();

        this.GeneratePlane();
        this.ChangeTopHeight();
        this.ChangeCutoff();
        // this.CalcColor();

        this.GenerateGeometry();
        
        this.material = new THREE.MeshPhongMaterial( { shininess: 0, flatShading: true, color: color } );
        this.mesh = new THREE.Mesh(this.geometry, this.material);
    }

    ChangeSeed(val)
    {
        let seed = document.getElementById("seed" + val).value;
        switch(val)
        {
            case 1:
                this.seed1 = seed;
                this.noise1 = openSimplexNoise(this.seed1);
                break;
            case 2:
                this.seed2 = seed;
                this.noise2 = openSimplexNoise(this.seed2);
                break;
            case 3:
                this.seed3 = seed;
                this.noise3 = openSimplexNoise(this.seed3);
                break;
        }
    }

    ChangeZoom(val)
    {
        let zoom = parseFloat(document.getElementById("seedZoom" + val).value);
        switch(val)
        {
            case 1:
                this.zoom1 = zoom;
                break;
            case 2:
                this.zoom2 = zoom;
                break;
            case 3:
                this.zoom3 = zoom;
                break;
        }
    }

    ChangeScale(val)
    {
        let scale = parseFloat(document.getElementById("seedScale" + val).value);
        switch(val)
        {
            case 1:
                this.scale1 = scale;
                break;
            case 2:
                this.scale2 = scale;
                break;
            case 3:
                this.scale3 = scale;
                break;
        }

        this.scaleTotal = this.scale1 + this.scale2 + this.scale3;
    }

    ChangeTopHeight()
    {
        let height = parseFloat(document.getElementById("maxHeightTop").value);
        this.maxHeight = height;
        this.RecalcHeight();
    }

    ChangeFalloff()
    {
        let falloff = parseFloat(document.getElementById("falloff").value);
        this.falloff = falloff;
        this.RecalcGeometry();
    }

    ChangeCutoff()
    {
        let cutoff = parseFloat(document.getElementById("cutoff").value);
        this.cutoff = cutoff;
        this.RecalcGeometry();
    }

    RecalcGeometry()
    {
        this.ResetBuffers();
        this.GeneratePlane();
        this.ChangeTopHeight();
        // this.CalcColor();
        this.GenerateGeometry();
    }

    ResetBuffers()
    {
        this.vertices = []; // dynamic storage for vertices before creating float32array for buffer

        this.index = []; // dynamic storage for indices before creating uint16array for buffer

        // this.normals = [];

        this.triRef = []; // relates triangle in grid to values in index (triRef pos = grid tri index, value = index of first point in index)
        let length = this.width * this.height;
        for(let i = 0; i < length; ++i)
        {
            this.triRef[i] = -1;
        }
    }

    UpdateEdges()
    {
        this.EdgePoints = [];
        
    }

    CalcColor()
    {
        this.vertexColors = [];
        for(let i = 0; i < this.vertices.length / 3; ++i)
        {
            this.vertexColors.push(this.vertices[i * 3 + 2] / this.maxHeight, 0, 0);// z coord
        }
    }

    SetWireframe()
    {
        let isWireframe = document.getElementById("wireframe").checked;
        this.material.wireframe = isWireframe;
    }

    GeneratePlane()
    {
        for(let i = 0; i < this.triRef.length; ++i)
        {
            let points = this.GetTriPoints(i);
            let noise = [this.GetNoise(points[0]), this.GetNoise(points[1]), this.GetNoise(points[2])];
            if(noise[0] > this.cutoff && 
               noise[1] > this.cutoff && 
               noise[2] > this.cutoff)
            {
                this.AddTri(i, points);
            }
        }
    }

    GenerateGeometry()
    {
        this.geometry = new THREE.BufferGeometry();

        this.geometry.setIndex(new THREE.Uint16BufferAttribute(this.index, 1));
        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.vertices, 3));
        // this.geometry.setAttribute('vertexColors', new THREE.Float32BufferAttribute(this.vertexColors, 3 ));
        this.geometry.computeVertexNormals();
        
        this.geometry.rotateX(-Math.PI / 2);

        if(this.mesh !== undefined)
        {
            this.UpdateMeshGeometry();
        }
    }

    RecalcHeight()
    {
        // generate new heights
        for(let i = 0; i < this.vertices.length; i += 3)
        {
            let point = new THREE.Vector3(this.vertices[i], this.vertices[i + 1], this.vertices[i + 2]);
            this.vertices[i + 2] = this.GetNoise(point) * this.maxHeight;
        }
        // this.CalcColor();
        this.GenerateGeometry();
    }

    UpdateMeshGeometry()
    {
        this.mesh.geometry.dispose();
        this.mesh.geometry = this.geometry;
    }

    GetNoise(point)
    {
        let value = (this.noise1.noise2D(point.x / this.zoom1, point.y / this.zoom1) * (this.scale1 / this.scaleTotal) +
                     this.noise2.noise2D(point.x / this.zoom2, point.y / this.zoom2) * (this.scale2 / this.scaleTotal) + 
                     this.noise3.noise2D(point.x / this.zoom3, point.y / this.zoom3) * (this.scale3 / this.scaleTotal) + 3) / 6; // get value between 0 and 1
        let distWeight = point.distanceTo(new THREE.Vector3(0,0,0)) / ((this.width * this.unitWidth + this.height * this.unitHeight) / 4);
        value *= Math.pow(1 - distWeight, this.falloff);
        return value;
    }

    GetNeighborTris(gridPos)
    {
        let neighbors = [];
        neighbors.push(undefined, undefined, undefined);
        let pos = this.GridToPoint(gridPos);
        
        let orientation = (pos.x + pos.y) % 2 == 0 ? 1 : -1;

        let point = new THREE.Vector2(pos.x, pos.y);
        point.x += orientation;
        if(this.IsOccupied(point)) // 1-2 edge shared
        {
            neighbors[0] = this.PointToGrid(point);
        }

        point.x -= orientation;
        point.y += orientation;
        if(this.IsOccupied(point)) // 2-3 edge shared
        {
            neighbors[1] = this.PointToGrid(point);
        }

        point.x -= orientation;
        point.y -= orientation;
        if(this.IsOccupied(point)) // 3-1 edge shared
        {
            neighbors[2] = this.PointToGrid(point);
        }
        return neighbors;
    }

    // returns at least one neighbor of tri at given gridpos for each point
    // neighbors[i] is a list of all points sharing the same position as corresponding point in given tri
    GetNeighborPoints(gridPos)
    {
        let neighbors = [];
        neighbors.push([], [], []);
        let pos = this.GridToPoint(gridPos);
        
        let orientation = (pos.x + pos.y) % 2 == 0 ? 1 : -1;
        
        // point 1
        let point = new THREE.Vector2(pos.x, pos.y);
        point.x -= orientation;
        if(this.IsOccupied(point))
        {
            neighbors[0].push(this.triRef[this.PointToGrid(point)] + 2);
        }
        point.y -= orientation;
        if(this.IsOccupied(point))
        {
            neighbors[0].push(this.triRef[this.PointToGrid(point)] + 1);
        }
        point.x += orientation;
        if(this.IsOccupied(point))
        {
            neighbors[0].push(this.triRef[this.PointToGrid(point)] + 0);
        }
        point.x += orientation;
        if(this.IsOccupied(point))
        {
            neighbors[0].push(this.triRef[this.PointToGrid(point)] + 2);
        }
        point.y += orientation;
        if(this.IsOccupied(point))
        {
            neighbors[0].push(this.triRef[this.PointToGrid(point)] + 1);
        }

        // point 2
        point = new THREE.Vector2(pos.x, pos.y);
        point.x += orientation;
        if(this.IsOccupied(point))
        {
            neighbors[1].push(this.triRef[this.PointToGrid(point)] + 0);
        }
        point.x += orientation;
        if(this.IsOccupied(point))
        {
            neighbors[1].push(this.triRef[this.PointToGrid(point)] + 2);
        }
        point.y += orientation;
        if(this.IsOccupied(point))
        {
            neighbors[1].push(this.triRef[this.PointToGrid(point)] + 1);
        }
        point.x -= orientation;
        if(this.IsOccupied(point))
        {
            neighbors[1].push(this.triRef[this.PointToGrid(point)] + 0);
        }
        point.x -= orientation;
        if(this.IsOccupied(point))
        {
            neighbors[1].push(this.triRef[this.PointToGrid(point)] + 2);
        }

        // point 3
        point = new THREE.Vector2(pos.x, pos.y);
        point.y += orientation;
        if(this.IsOccupied(point))
        {
            neighbors[2].push(this.triRef[this.PointToGrid(point)] + 1);
        }
        point.x -= orientation;
        if(this.IsOccupied(point))
        {
            neighbors[2].push(this.triRef[this.PointToGrid(point)] + 0);
        }
        point.x -= orientation;
        if(this.IsOccupied(point))
        {
            neighbors[2].push(this.triRef[this.PointToGrid(point)] + 2);
        }
        point.y -= orientation;
        if(this.IsOccupied(point))
        {
            neighbors[2].push(this.triRef[this.PointToGrid(point)] + 1);
        }
        point.x += orientation;
        if(this.IsOccupied(point))
        {
            neighbors[2].push(this.triRef[this.PointToGrid(point)] + 0);
        }
        return neighbors;
    }

    AddTri(gridPos, points)
    {
        let neighbors = this.GetNeighborPoints(gridPos);
        this.triRef[gridPos] = this.index.length;
        for(let i = 0; i < 3; ++i)
        {
            if(neighbors[i].length > 0) // vert already made
            {
                this.index.push(this.index[neighbors[i][0]]);
            }
            else // new vert
            {
                this.index.push(this.vertices.length / 3);
                this.vertices.push(points[i].x, points[i].y, 0);
            }
        }
    }

    GetTriPoints(gridPos)
    {
        let pos = this.GridToPoint(gridPos);
        let worldPos = this.GridToWorld(gridPos);
        let points = [];

        if((pos.x + pos.y) % 2 == 0) // pointing negative
        {
            points.push(new THREE.Vector3(worldPos.x, worldPos.y - this.unitHeight / 2, worldPos.z));                      // 1 tip
            points.push(new THREE.Vector3(worldPos.x + this.unitWidth / 2, worldPos.y + this.unitHeight / 2, worldPos.z)); // 2 clockwise from tip
            points.push(new THREE.Vector3(worldPos.x - this.unitWidth / 2, worldPos.y + this.unitHeight / 2, worldPos.z)); // 3 counter-clockwise from tip
        }
        else // pointing positive
        {
            points.push(new THREE.Vector3(worldPos.x, worldPos.y + this.unitHeight / 2, worldPos.z));                      // 1 tip
            points.push(new THREE.Vector3(worldPos.x - this.unitWidth / 2, worldPos.y - this.unitHeight / 2, worldPos.z)); // 2 clockwise from tip
            points.push(new THREE.Vector3(worldPos.x + this.unitWidth / 2, worldPos.y - this.unitHeight / 2, worldPos.z)); // 3 counter-clockwise from tip
        }
        return points;
    }

    // gridpos is index of triangle in triRef
    GridToWorld(gridPos)
    {
        let pos = this.GridToPoint(gridPos);
        return new THREE.Vector3((this.unitWidth / 2) * (pos.x + 1) + this.offset.x, 
                                 ((Math.sqrt(3) / 2) * this.unitWidth) * (pos.y + 0.5) + this.offset.y,
                                 this.offset.z);
    }

    // returns the xy grid address of point from triRef index
    GridToPoint(gridPos)
    {
        return new THREE.Vector2(gridPos % this.width, Math.floor(gridPos / this.width));
    }

    PointToGrid(point)
    {
        return point.y * this.width + point.x;
    }

    IsOccupied(point)
    {
        if(point.x < this.width && point.x >= 0 && point.y < this.height && point.y >= 0 &&
           this.triRef[this.PointToGrid(point)] >= 0)
        {
            return true;
        }
        return false;
    }
}