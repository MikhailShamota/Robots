var Textures = {

    loader: new THREE.TextureLoader(),
    collection: {},
    add: function(file, func) {

        var tex = this.collection[ file ];

        if ( tex )
            return func && func( tex ) || !func && tex;

        var self = this;

        this.loader.load(
            file,
            function (texture) {

                self.collection[ file ] = texture;
                return func && func( texture ) || !func && tex;
            },
            function (xhr) {

                //console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
                console.log( 'load "' + file + '" OK' );
            },
            function (xhr) {

                console.log( 'load "' + file + '" failed' );
            }
        );
    }
};



