function Player( id ) {

    this.id = id;

    this.fleet = null;

    this.isMouseDown = 0;

    this.changeCallback = null;
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

/*    var vessel = this.fleet.vesselsList[0].obj;

    return vessel.pack();*/
};

Player.prototype.unpack = function( data ) {

/*    var vessel = this.fleet.vesselsList[0].obj;

    vessel.unpack( data );*/
};

Player.prototype.change = function() {

    this.changeCallback && this.changeCallback();
};

