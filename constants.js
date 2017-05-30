const MSEC_IN_SEC = 1000;

const V3_ZERO = new THREE.Vector3(0, 0, 0);
const V3_UNIT_X = new THREE.Vector3(1, 0, 0);
const V3_UNIT_Y = new THREE.Vector3(0, 1, 0);
const V3_UNIT_Z = new THREE.Vector3(0, 0, 1);

const WORLD_SIZE = 1000;

const K_GRAVITY = 2;
const K_SPACE_RESIST = 10;
const VELOCITY_LIMIT_PER_SEC = 100;
const K_CENTER_FORCE = 20;//force pulling to ecliptic plane

const R_PLANET_MIN = 30;
const R_PLANET_MAX = 130;

const SEC_EXCH_PERIOD = 0.1;//peer-to-peer message send period

const SEC_TO_PEER_PT = 3;//seconds to reach peer point. More to smooth, less to precision