function Fleet() {

    //obj property added due initialization
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

Fleet.prototype.init = function( scene, octree, color ) {

    function startPos( i ) {

        return new THREE.Vector3( 0, 20 * ( i + 1 ), -500 );
    }

    //var q = this.vesselsList.length;

    this.vesselsList.forEach( (item, i ) => {

        var obj = item.f( startPos( i ), color );

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
