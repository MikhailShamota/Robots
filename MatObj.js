function Obj() {

}

Obj.nextId = 0;

function MatObj( ) {

    this.id = Obj.nextId++;
    this.mov = new THREE.Vector3();


    this.update = function() {

    }
}

MatObj.prototype = Obj;

function Asteroid( pos, radius ) {

    this.pos = pos;

    this.mesh = new THREE.Mesh(
        new THREE.SphereGeometry( radius, 32, 32 ),
        new THREE.MeshLambertMaterial( {color: 0x20AA20, side: 2, shading: THREE.FlatShading} )
    );

    this.mesh.position.copy( this.pos );
}

Asteroid.prototype = MatObj;

function Sun( pos, radius, color ) {

    this.pos = pos;

    this.mesh = new THREE.Mesh(
        new THREE.SphereGeometry( radius, 32, 32 ),
        new THREE.MeshBasicMaterial( {color: color} )
    );

    this.mesh.position.copy( this.pos );

    this.light = new THREE.PointLight( color, 1, 0 );
    this.light.position.copy( this.pos );
}

Sun.prototype = MatObj;



