// Universal Animation Library (Quaternius, Unreal-style skeleton) -> VRM humanoid bone names (three-vrm 1.0 naming).
const SIDES = [['l', 'left'], ['r', 'right']];
export const UAL_TO_HUMAN = { pelvis: 'hips', spine_01: 'spine', spine_02: 'chest', spine_03: 'upperChest', neck_01: 'neck', Head: 'head' };
for (const [s, side] of SIDES) {
  Object.assign(UAL_TO_HUMAN, {
    [`clavicle_${s}`]: `${side}Shoulder`, [`upperarm_${s}`]: `${side}UpperArm`, [`lowerarm_${s}`]: `${side}LowerArm`, [`hand_${s}`]: `${side}Hand`,
    [`thigh_${s}`]: `${side}UpperLeg`, [`calf_${s}`]: `${side}LowerLeg`, [`foot_${s}`]: `${side}Foot`, [`ball_${s}`]: `${side}Toes`,
    [`thumb_01_${s}`]: `${side}ThumbMetacarpal`, [`thumb_02_${s}`]: `${side}ThumbProximal`, [`thumb_03_${s}`]: `${side}ThumbDistal`,
  });
  for (const [f, F] of [['index', 'Index'], ['middle', 'Middle'], ['ring', 'Ring'], ['pinky', 'Little']]) {
    Object.assign(UAL_TO_HUMAN, { [`${f}_01_${s}`]: `${side}${F}Proximal`, [`${f}_02_${s}`]: `${side}${F}Intermediate`, [`${f}_03_${s}`]: `${side}${F}Distal` });
  }
}
