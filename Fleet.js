function Fleet() {

    this.vesselsList = [

        {
            f: smallFighter
        },
        {
            f: bigFighter
        }
    ];

    function smallFighter( p ) {

        var fighter = new Fighter( p, 20000 );

        return fighter.mesh( 0xFF1111 );
    }

    function bigFighter( p ) {

        var fighter = new Fighter( p, 50000 );

        return fighter.mesh( 0x11FF11 );
    }
}

Fleet.prototype.init = function(scene, octree) {

    function startPos( i ) {

        return new THREE.Vector3( 0, 200 * (i + 1), 0 );
    }

    //var q = this.vesselsList.length;

    this.vesselsList.forEach( (item, i ) => {

        var objMesh = item.f( startPos( i ) );

        scene.add( objMesh );
        octree.add( objMesh );
    });
};
