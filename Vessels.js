function Vessel( pos, mass ) {

    MatObj.apply( this, arguments );
}

extend( Vessel, MatObj );

/*Vessel.prototype.mesh = function( size, color ) {

    return this.prototype.mesh( m );
};*/

function Fighter( pos, mass ) {

    Vessel.apply( this, arguments );
}

extend (Fighter, Vessel )

Fighter.prototype.mesh = function () {

    var size = Math.cbrt( this.mass );

    var m = new THREE.Mesh(
        new THREE.BoxGeometry( size, size, size, 0, 0, 0 ),
        new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading})
    );

    return this.prototype.mesh( m );
}