function Fleet() {

    this.vesselsList = [

        {
            f: smallFighter,
            to: toPos
        },
        {
            f: bigFighter,
            to: toRandom
        }
    ];

    function smallFighter( p ) {

        return new Fighter( p, 20000, 0xFF1111 );
    }

    function bigFighter( p ) {

        return new Fighter( p, 50000, 0x11FF11 );
    }

    function toPos( pos ) {

        return pos;
    }

    function toRandom() {

        return v3Random() * WORLD_SIZE;
    }
}

Fleet.prototype.update = function(mousePos) {

    this.vesselsList.forEach( (item ) => {

        item.obj.to = item.to( mousePos ).clone();//where go to
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

        item.obj = obj;//a link to vessel
    });
};
