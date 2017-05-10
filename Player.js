function Player( id, num ) {

    this.id = id;

    this.fleet = null;

    this.isMouseDown = 0;

    this.changeCallback = null;

    this.color = this.colors[ num ];
}

Player.prototype.colors = [ 0xaa0000, 0x00aa00, 0x0000aa, 0xaaaa00, 0xaa00aa ];

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

