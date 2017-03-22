function LoopedArray(qty, ms) {

    this.array = [];
    this.maxQty = qty;
    this.timeout = ms;

    this.nextIdx = 0;//newest to create
    this.lastIdx = 0;//oldest created
}

LoopedArray.prototype.now = function() {

    return Date.now();
};

LoopedArray.prototype.addItem = function(item) {

    item.created = this.now();
    this.array[ this.nextIdx ] = item;
    this.nextIdx = ( this.nextIdx + 1 ) % this.maxQty;
};

LoopedArray.prototype.getLastOutTime = function() {

    var now = this.now();

    var last = this.array[ this.lastIdx ];

    if ( last && now - last.created > this.timeout ) {

        this.lastIdx = ( this.lastIdx + 1 ) % this.maxQty;

        return last;
    }
};

LoopedArray.prototype.mapAll = function( func ) {

    if ( this.lastIdx < this.nextIdx ) {
        for ( var i = this.lastIdx; i < this.nextIdx; i++ ) {

            func( this.array[ i ] );
        }
    } else
    {
        for ( var j = 0; j < this.nextIdx; j++ ) {

            func( this.array[ j ] );
        }
        for ( var k = this.lastIdx; k < this.array.length; k ++ ) {

            func( this.array[ k ] );
        }
    }
};