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

        var fighter = new Fighter( p, 2 );

        return fighter.mesh( 0xFF1111 );
    }

    function bigFighter( p ) {

        var fighter = new Fighter( p, 5 );

        return fighter.mesh( 0x11FF11 );
    }
}

Fleet.prototype.init = function(scene, octree) {

    function startPos() {

    }

    var q = this.vesselsList.length;

    this.vesselsList.forEach( (item, i) => {

        for ( var x = 0; x < (item.q || 1); x++ ) {

            var objMesh = item.f( startPos() );

            scene.add( objMesh );
            octree.add( objMesh );
        }
    });
};
