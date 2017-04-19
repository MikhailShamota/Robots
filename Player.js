function Player( id ) {

    this.id = id;

    this.fleet = null;

    this.isMouseDown = 0;
}

Player.prototype.setMouseDown = function() {

    this.isMouseDown++;
};

Player.prototype.setMouseUp = function() {

    this.isMouseDown = 0;
};

Player.prototype.pack = function() {

    return {

        m: this.isMouseDown
    }
};

Player.prototype.unpack = function( data ) {

    this.isMouseDown = data.m;
};


