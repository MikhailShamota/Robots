function Player( id ) {

    this.id = id;

    this.fleet = null;

    this.isMouseDown = 0;

    this.changeCallback = null;

    this.color = new THREE.Color().setHSL( ( Math.sin( id.hashCode() ) + 1 ) * 0.5 /*0..1*/ , 0.5, 0.5 );
}

Player.prototype.getVessel = function() {

    return this.fleet.vesselsList[0].obj;
};

Player.prototype.setMouseDown = function() {

    this.isMouseDown++;

    this.change();
};

Player.prototype.setMouseUp = function() {

    this.isMouseDown = 0;

    this.change();
};

Player.prototype.pack = function() {

    return this.getVessel().pack();
};

Player.prototype.unpack = function( data ) {

    this.getVessel().unpack( data );
};

Player.prototype.change = function() {

    this.changeCallback && this.changeCallback();
};

