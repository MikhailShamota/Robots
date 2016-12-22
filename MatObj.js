function MatObj(pos, mass) {

    this.pos = pos;
    this.mass = mass;
    this.velocity = null;
    this.f = null;
}

MatObj.prototype.update = function( dt ) {

        if ( !this.velocity )//if it is unmovable
            return;

        var v = this.f.clone().multiplyScalar( dt / this.mass );

        this.velocity.add( v );
        this.pos.add( this.velocity.clone().multiplyScalar( dt ) );
}

MatObj.prototype.gravity = function(obj) {

        var r = obj.pos.clone().sub( this.pos );
        var rSq = r.lengthSq();

        return r.normalize().multiplyScalar( 30.0 * this.mass * obj.mass / rSq );
}

function Celestial(pos, mass) {

    MatObj.apply( this, arguments );

    this.mass = mass;
}

extend( Celestial, MatObj );

Celestial.prototype.mesh = function(radius, color) {

        var m = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 32, 32),
            new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading})
        );

        m.position.copy( this.pos );
        m.userData = this;

        return m;
}

//Celestial.prototype = Object.create( MatObj.prototype );

function Asteroid(pos, mass) {

    Celestial.apply( this, arguments );
}

extend( Asteroid, Celestial );

function Planet(pos, mass) {

    Celestial.apply( this, arguments );
}

extend( Planet, Celestial );

function Sun(pos, mass, color) {

    Celestial.apply( this, arguments );

    this.light = new THREE.PointLight( color, 1, 0 );
    this.light.position = this.pos;

    //this.mesh.material = new THREE.MeshBasicMaterial( {color: color} );
}

extend( Sun, Celestial );

function extend(Child, Parent) {

    var F = function() { };
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
}




