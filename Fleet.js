function Fleet() {

    //obj property added due initialization
    this.vesselsList = [

        {
            f: smallFighter,
            to: toPos
        },
        {
            f: bigFighter,
            to: toZero
        }
    ];

    function smallFighter( p ) {

        return new Fighter( p, 2000, 0xFF1111 );
    }

    function bigFighter( p ) {

        return new Fighter( p, 5000, 0x11FF11 );
    }

    function toPos( pos ) {

        return pos;
    }

    function toZero() {

        return V3_ZERO.clone();
    }
}

Fleet.prototype.update = function(mousePos) {

    this.vesselsList.forEach( (item ) => {

        var to = item.to( mousePos );
        item.obj.to = to && to.clone();//where go to
    });
};

Fleet.prototype.init = function(scene, octree) {

    function startPos( i ) {

        return new THREE.Vector3( 0, 200 * (i + 1), 0 );
    }

    //var q = this.vesselsList.length;

    this.vesselsList.forEach( (item, i ) => {

        var obj = item.f( startPos( i ) );

        scene.add( obj.mesh );
        octree.add( obj.mesh );

        //trail
        obj.initTrail();
        obj.trailMeshes.forEach( function(item) {

            scene.add( item );
        });

        item.obj = obj;//a link to vessel
    });
};
