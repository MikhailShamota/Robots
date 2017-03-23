function Flare(pos, size, color, texture) {

    var material	= new THREE.SpriteMaterial({

        map: texture && Textures.add( texture ),
        color : color,
        blending : THREE.AdditiveBlending,
        transparent: true
    });

    var sprite	= new THREE.Sprite( material );
    sprite.scale.set( size, size, size );

    sprite.position.copy( pos );

    var object3d = new THREE.Object3D();
    object3d.add( sprite );

    // add a point light
    var light	= new THREE.PointLight( color );

    light.intensity	= 1;
    light.distance	= size * 5;
    light.position.copy( pos );

    sprite.add( light );

    return object3d;
}