
# DEMO Project: Ms. Amoy

[中文](./README.zh-Hans-CN.md)

This project is to demonstrate the use of Cocos Creator Marionette animation system.

## Introduction

The project has only one main scene, located in `assets/Scenes/Main.scene`.

Once the game starts, the player can control the heroine "Ms. Amoy" (hereafter called the heroine) in a simple battle from the first perspective.

### General Rules

Please focus on the consistency of the action - almost all action switches are smooth.

### Monsters

Several monster characters will be generated in the scene, and they will behave as follows:

- Standby and move to a random location after a random amount of time on standby.

- Once they find the heroine approaching, they will enter battle mode and chase the heroine.

  - After close enough to the heroine and fully facing the heroine, they will begin to attack.

  - They will re-enter the standby state when they are too far away from the heroine.

### Heroine

The heroine can be freely controlled by the player:

  - [When using the mouse] Use the right mouse button to turn the direction the heroine is facing, the left mouse button to turn the camera angle, and the mouse wheel to adjust the camera distance.

  - [When using the touch screen] Use one touch point to move left and right to turn the direction the heroine is facing, use two touch points (approximately) to move in the same direction to turn the camera angle, and use two touch points to draw closer or farther to adjust the camera distance.

  - Use the joystick ![Image description](./docs/Joystick.png "title") to control the direction of movement (without changing the orientation).

  - Use the attack button ![Image description](./docs/Attack.png "title") to attack.

  - Use the reload button ![Image description](./docs/Bullet.png "title") to reload ammo (presentation only, no real logic).

  - Use the crouch button ![Image description](./docs/Crouch.png "title") to crouch or uncrouch.

  - Use the jump button ![Image description](./docs/Jump.png "title") to jump.

  - Use the aim button ![Image description](./docs/Aim.png "title") to enter or exit aiming mode.

There are the following rules to be noted:

  - Aiming and un-aiming are available in both crouching and standing modes.

  - Movement is possible in both crouching and standing mode, but the motion is different.

  - After switching to normal standby mode and waiting for a moment, you will switch to another normal standby action.

### Combat System

- Both the heroine and monsters have directional and distance restrictions on their attacks. Monsters deal actual damage if both direction and distance are met after 0.5 seconds (foreswing) of launching an attack action. The heroine attack has no foreswing.

- Both the heroine and monsters will play the corresponding animation after taking damage.

- After launching an attack, the damage determination will not be interrupted by switching to another action (such as taking damage).

## Known Issues

- Both monsters and the heroine may move unrealistically (slide) when they are hit.

## What is Amoy?

Amoy is the old English name for the Chinese city of Xiamen.
