function Flare(pos, size, color) {

    var material	= new THREE.SpriteMaterial({

        color : color,
        blending : THREE.AdditiveBlending
    });

    var sprite	= new THREE.Sprite( material );
    sprite.scale.set( size, size, size );

    sprite.position.copy( pos );

    var object3d = new THREE.Object3D();
    object3d.add(sprite);

    // add a point light
    var light	= new THREE.PointLight( color );

    light.intensity	= 1;
    light.distance	= size * 5;
    light.position.copy( pos );

    sprite.add( light );

    return object3d;
}

/*function FlareTexture() {

    var textureUrl	= THREEx.LaserCooked.baseURL+'images/blue_particle.jpg';
    var texture	= new THREE.TextureLoader().load(textureUrl)
    material.texture = texture;
}

extend( FlareTexture, Flare );*/

