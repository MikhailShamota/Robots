function Player( id ) {

    this.id = id;

    this.fleet = null;

    this.isMouseDown = 0;

    this.changeCallback = null;
}

Player.prototype.setMouseDown = function() {

    this.isMouseDown++;

    this.change();
};

Player.prototype.setMouseUp = function() {

    this.isMouseDown = 0;

    this.change();
};

Player.prototype.pack = function() {

    var vessel = this.fleet.vesselsList[0];

    return {

        m: this.isMouseDown
        //v: vessel.pack()
    }
};

Player.prototype.unpack = function( data ) {

    this.isMouseDown = data.m;
};

Player.prototype.change = function() {

    this.changeCallback && this.changeCallback();
};

