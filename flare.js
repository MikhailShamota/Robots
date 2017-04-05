function Flare( pos, size, color, texture ) {

    var material	= new THREE.SpriteMaterial( {

        map: texture && Textures.add( texture ),
        color : color,
        blending : THREE.AdditiveBlending,
        transparent: true
    } );

    var sprite	= new THREE.Sprite( material );
    sprite.scale.set( size, size, size );

    sprite.position.copy( pos );

    var object3d = new THREE.Object3D( );
    object3d.add( sprite );

    // add a point light
    // тормозит
    /*var light	= new THREE.PointLight( color );

    light.intensity	= 1;
    light.distance	= size * 5;
    light.position.copy( pos );

    sprite.add( light );*/

    return object3d;
}

function Beam( ray, length ) {

    var material = new THREE.MeshLineMaterial( {

        color: new THREE.Color( "rgb( 255, 255, 2 )" ),
        opacity: 0.5,
        resolution: V2_RESOLUTION,
        sizeAttenuation: 1,
        lineWidth: 2,
        near: 1,
        far: 100000,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        side: THREE.DoubleSide
    } );

    const beamLen = 50;
    var geom = new THREE.Geometry( );

    geom.vertices.push( ray.origin.clone( ) );
    geom.vertices.push( ray.origin.clone( ).add( ray.direction.clone( ).multiplyScalar( beamLen ) ) );

    var line = new THREE.MeshLine( );
    line.setGeometry( geom );

    var mesh = new THREE.Mesh( line.geometry, material ); // this syntax could definitely be improved!*/

    mesh.source_dir = ray.direction.clone();
    mesh.source_length = length - beamLen;

    return mesh;
}

function BeamMove( mesh ) {

    const speed = 100;
    var add = mesh.source_dir.clone().multiplyScalar( speed );

    mesh.source_length -= speed;

    //impact
    if ( mesh.source_length <= 0 ) {

        mesh.position.x = undefined;//hide
        return;
    }

    mesh.position.add( add );//move
}
