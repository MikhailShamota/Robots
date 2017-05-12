function Fleet( color ) {

    //obj property added due initialization
    this.color = color;

    this.vesselsList = [

        {
            f: smallFighter,
            to: toPos
        }/*,
        {
            f: bigFighter,
            to: toZero
        }*/
    ];

    function smallFighter( p, color ) {

        return new Fighter( p, 3000, color );
    }

    function bigFighter( p, color ) {

        return new Fighter( p, 5000, color );
    }

    function toPos( pos ) {

        return pos;
    }

    function toZero() {

        return V3_ZERO.clone();
    }
}

Fleet.prototype.update = function( mousePos ) {

    this.vesselsList.forEach( (item ) => {

        var to = item.to( mousePos );
        item.obj.to = ( to && to.clone() );//where go to
    });
};

Fleet.prototype.start = function() {

    this.vesselsList.forEach( function( item ) {

        var obj = item.obj;

        obj.init();
        obj.pos = MathHelper.v3Random( WORLD_SIZE );
    });
};

Fleet.prototype.init = function( scene, octree ) {

    /*function startPos( i ) {

        return MathHelper.v3Random( WORLD_SIZE * 0.5 );
    }*/

    this.vesselsList.forEach( (item, i ) => {

        var obj = item.f( /*startPos( i )*/null, this.color );

        scene.add( obj.mesh );
        octree.add( obj.mesh );

        //trail
        obj.initTrail();
        obj.trailMeshes.forEach( function(item) {

            scene.add( item );
        });

        item.obj = obj;//a link to vessel
    });

    octree.update();
};
