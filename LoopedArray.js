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

LoopedArray.prototype.getNext = function( i ) {

    return ( i + 1 ) % this.maxQty;
};

LoopedArray.prototype.addItem = function(item) {

    //if ( this.getNext( this.nextIdx ) == this.lastIdx )//if nowhere
    if ( this.array[ this.nextIdx ] ) //if nowhere
        return false;//хуй

    item.created = this.now();
    this.array[ this.nextIdx ] = item;
    this.nextIdx = this.getNext( this.nextIdx );

    return true;
};

LoopedArray.prototype.pullLastOutOfTime = function() {

    var now = this.now();

    var last = this.array[ this.lastIdx ];

    if ( last && now - last.created > this.timeout ) {

        this.array[ this.lastIdx ] = undefined;

        this.lastIdx = this.getNext( this.lastIdx );

        return last;
    }

    return null;
};

LoopedArray.prototype.mapAll = function( func ) {

    if ( this.lastIdx < this.nextIdx ) {
        for ( var i = this.lastIdx; i < this.nextIdx; i++ ) {

            this.array[ i ] && func( this.array[ i ] );
        }
    } else
    {
        for ( var j = 0; j < this.nextIdx; j++ ) {

            this.array[ j ] && func( this.array[ j ] );
        }
        for ( var k = this.lastIdx; k < this.array.length; k ++ ) {

            this.array[ k ] && func( this.array[ k ] );
        }
    }
};