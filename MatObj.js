function MatObj(pos) {

    this.pos = pos;
    this.mov = null;
    this.mesh = null;
    this.mass = 0;
}

MatObj.prototype = {

    geometry : null,

    init : function() {

        this.mesh = new THREE.Mesh(
            this.geometry,
            this.material
        );

        this.mesh.position.copy( this.pos );
    },

    update : function(dt) {

        this.pos.add( this.mov.clone().multiplyScalar( dt ) );

        this.mesh.position.copy( this.pos );
    },

    gravity : function(obj) {

        var r = obj.pos.clone().sub( this.pos );
        var rSq = r.lengthSq();

        return r.normalize().multiplyScalar( 0.0001 * this.mass * obj.mass / rSq );
    }
};

function Celestial(pos, radius, color) {

    MatObj.apply( this, arguments );

    this.color = color;
    this.material = new THREE.MeshLambertMaterial( {color: color, side: 2, shading: THREE.FlatShading} );

    this.geometry = new THREE.SphereGeometry( radius, 32, 32 );

    this.mass = radius * radius * radius;
}

extend( Celestial, MatObj );
//Celestial.prototype = Object.create( MatObj.prototype );

function Asteroid(pos, radius, color) {

    Celestial.apply( this, arguments );
}

extend( Asteroid, Celestial );

function Planet(pos, radius, color) {

    Celestial.apply( this, arguments );
}

extend( Planet, Celestial );

function Sun(pos, radius, color) {

    Celestial.apply( this, arguments );

    this.material = new THREE.MeshBasicMaterial( {color: color} );

    this.light = new THREE.PointLight( color, 1, 0 );
    this.light.position.copy( this.pos );
}

extend( Sun, Celestial );

function extend(Child, Parent) {

    var F = function() { };
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
}




