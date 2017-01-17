function Vessel( pos, mass ) {

    MatObj.apply( this, arguments );

    this.f = null;//propulsion force
    this.velocity = new THREE.Vector3( 0, 0 ,0 );//movable
}

extend( Vessel, MatObj );

/*Vessel.prototype.mesh = function( m ) {

    return this.prototype.mesh( m );
};*/

function Fighter( pos, mass ) {

    Vessel.apply( this, arguments );

    this.f = new THREE.Vector3( 0, 0, 1 ).multiplyScalar( mass * 20 );
}

extend (Fighter, Vessel )

Fighter.prototype.mesh = function ( color ) {

    var size = Math.cbrt( this.mass );

    var m = new THREE.Mesh(
        new THREE.BoxGeometry( size, size, size, 0, 0, 0 ),
        new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading})
    );

    return this.initMesh( m );
}