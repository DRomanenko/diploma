<template>
  <Renderer
    ref="rendererC"
    antialias
    :orbit-ctrl="{ enableDamping: true }"
    resize="window"
  >
    <PerspectiveCamera
      :position="{ x: 2, y: 2, z: 2 }"
      :fov="36"
      :near="1"
      :far="100"
    />
    <Scene ref="sceneC">
      <!--      <AmbientLight :intensity="0.1" />-->
      <!--      <HemisphereLight :position="{ y: 500, z: 500 }" />-->
    </Scene>
  </Renderer>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { GUI } from "lil-gui";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import {
  PerspectiveCamera,
  Renderer,
  RendererPublicInterface,
  Scene,
} from "troisjs";

export default defineComponent({
  name: "App",
  components: {
    PerspectiveCamera,
    Renderer,
    Scene,
  },
  data() {
    return {
      mesh: new THREE.Mesh(),
      params: {
        animate: false,
        planeX: {
          constant: 0,
          negated: false,
          displayHelper: false,
        },
        planeY: {
          constant: 0,
          negated: false,
          displayHelper: false,
        },
        planeZ: {
          constant: 0,
          negated: false,
          displayHelper: false,
        },
      },
    };
  },
  mounted() {
    this.init();
  },
  methods: {
    init() {
      const renderer = this.$refs.rendererC as RendererPublicInterface;
      const scene: THREE.Scene = this.$refs.sceneC as THREE.Scene;

      const object = new THREE.Group();
      scene.add(object);

      // TODO Добавить отсечение плоскостями

      const planes: Array<THREE.Plane> = [
        // new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
        new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
        // new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
      ];
      const planeHelpers: Array<THREE.PlaneHelper> = planes.map(
        (p) => new THREE.PlaneHelper(p, 2, 0xffffff)
      );
      planeHelpers.forEach((ph) => {
        ph.visible = false;
        scene.add(ph);
      });

      const loader = new STLLoader();
      if (renderer) {
        renderer.renderer.localClippingEnabled = true;

        scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7.5);
        dirLight.castShadow = true;
        dirLight.shadow.camera.right = 2;
        dirLight.shadow.camera.left = -2;
        dirLight.shadow.camera.top = 2;
        dirLight.shadow.camera.bottom = -2;

        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        scene.add(dirLight);

        // Set up clip plane rendering
        const planeObjects: Array<
          THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>
        > = [];
        const planeGeom = new THREE.PlaneGeometry(4, 4);

        const mesh = new THREE.Mesh();
        const clippedColorFront = new THREE.Mesh();
        loader.load(
          "models/1250_polygon_sphere_100mm.stl",
          function (geometry) {
            const material = new THREE.MeshStandardMaterial({
              color: 0xffc107,
              metalness: 0.1,
              roughness: 0.75,
              clippingPlanes: planes,
              clipShadows: true,
              shadowSide: THREE.DoubleSide,
            });

            const new_geometry = new THREE.TorusKnotGeometry(
              0.4,
              0.15,
              220,
              60
            );

            // const new_geometry = geometry;

            mesh.geometry = new_geometry;
            mesh.material = material;
            // mesh.position.set(0, -0.25, 0.6);
            // mesh.rotation.set(0, -Math.PI / 2, 0);
            // mesh.scale.set(0.1, 0.1, 0.1);

            clippedColorFront.geometry = new_geometry;
            clippedColorFront.material = material;
            clippedColorFront.castShadow = true;
            clippedColorFront.renderOrder = 6;
            // clippedColorFront.scale.set(0.5, 0.5, 0.5);

            for (let i = 0; i < 3; i++) {
              const poGroup = new THREE.Group();
              const plane = planes[i];

              const stencilGroup = new THREE.Group();
              const baseMat = new THREE.MeshBasicMaterial();
              baseMat.depthWrite = false;
              baseMat.depthTest = false;
              baseMat.colorWrite = false;
              baseMat.stencilWrite = true;
              baseMat.stencilFunc = THREE.AlwaysStencilFunc;

              // back faces
              const mat0 = baseMat.clone();
              mat0.side = THREE.BackSide;
              mat0.clippingPlanes = [plane];
              mat0.stencilFail = THREE.IncrementWrapStencilOp;
              mat0.stencilZFail = THREE.IncrementWrapStencilOp;
              mat0.stencilZPass = THREE.IncrementWrapStencilOp;

              const mesh0 = new THREE.Mesh(new_geometry, mat0);
              mesh0.renderOrder = i + 1;
              stencilGroup.add(mesh0);

              // front faces
              const mat1 = baseMat.clone();
              mat1.side = THREE.FrontSide;
              mat1.clippingPlanes = [plane];
              mat1.stencilFail = THREE.DecrementWrapStencilOp;
              mat1.stencilZFail = THREE.DecrementWrapStencilOp;
              mat1.stencilZPass = THREE.DecrementWrapStencilOp;

              const mesh1 = new THREE.Mesh(new_geometry, mat1);
              mesh1.renderOrder = i + 1;

              stencilGroup.add(mesh1);

              // plane is clipped by the other clipping planes
              const planeMat = new THREE.MeshStandardMaterial({
                color: 0xe91e63,
                metalness: 0.1,
                roughness: 0.75,
                clippingPlanes: planes.filter((p) => p !== plane),

                stencilWrite: true,
                stencilRef: 0,
                stencilFunc: THREE.NotEqualStencilFunc,
                stencilFail: THREE.ReplaceStencilOp,
                stencilZFail: THREE.ReplaceStencilOp,
                stencilZPass: THREE.ReplaceStencilOp,
              });
              const po = new THREE.Mesh(planeGeom, planeMat);
              po.onAfterRender = function (renderer) {
                renderer.clearStencil();
              };

              po.renderOrder = i + 1.1;

              object.add(stencilGroup);
              poGroup.add(po);
              planeObjects.push(po);
              scene.add(poGroup);
            }

            // const ground = new THREE.Mesh(
            //   new THREE.PlaneGeometry(9, 9, 1, 1),
            //   new THREE.ShadowMaterial({
            //     color: 0x000000,
            //     opacity: 0.25,
            //     side: THREE.DoubleSide,
            //   })
            // );
            //
            // ground.rotation.x = -Math.PI / 2; // rotates X/Y to X/Z
            // ground.position.y = -1;
            // ground.receiveShadow = true;
            // scene.add(ground);

            for (let i = 0; i < planeObjects.length; i++) {
              const plane = planes[i];
              const po = planeObjects[i];
              // plane.coplanarPoint(po.position);
              po.lookAt(
                po.position.x - plane.normal.x,
                po.position.y - plane.normal.y,
                po.position.z - plane.normal.z
              );
            }
          }
        );
        object.add(mesh);
        object.add(clippedColorFront);

        this.mesh = mesh;

        const gui = new GUI();
        gui.add(this.params, "animate");

        const planeX = gui.addFolder("planeX");
        planeX
          .add(this.params.planeX, "displayHelper")
          .onChange((v: boolean) => (planeHelpers[0].visible = v));
        planeX
          .add(this.params.planeX, "constant")
          .min(-1)
          .max(1)
          .onChange((d: number) => (planes[0].constant = d));
        planeX.add(this.params.planeX, "negated").onChange(() => {
          planes[0].negate();
          this.params.planeX.constant = planes[0].constant;
        });
        planeX.open();

        // const planeY = gui.addFolder("planeY");
        // planeY
        //   .add(this.params.planeY, "displayHelper")
        //   .onChange((v: boolean) => (planeHelpers[1].visible = v));
        // planeY
        //   .add(this.params.planeY, "constant")
        //   .min(-25)
        //   .max(25)
        //   .onChange((d: number) => (planes[1].constant = d));
        // planeY.add(this.params.planeY, "negated").onChange(() => {
        //   planes[1].negate();
        //   this.params.planeY.constant = planes[1].constant;
        // });
        // planeY.open();

        // const planeZ = gui.addFolder("planeZ");
        // planeZ
        //   .add(this.params.planeZ, "displayHelper")
        //   .onChange((v: boolean) => (planeHelpers[2].visible = v));
        // planeZ
        //   .add(this.params.planeZ, "constant")
        //   .min(-25)
        //   .max(25)
        //   .onChange((d: number) => (planes[2].constant = d));
        // planeZ.add(this.params.planeZ, "negated").onChange(() => {
        //   planes[2].negate();
        //   this.params.planeZ.constant = planes[2].constant;
        // });
        // planeZ.open();

        // mesh.geometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);
        renderer.onBeforeRender(() =>
          this.animate(this.mesh, planeObjects, planes)
        );
        renderer.renderer.setClearColor(0x263238);
      }
    },

    animate(
      mesh: THREE.Mesh,
      planeObjects: Array<
        THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>
      >,
      planes: Array<THREE.Plane>
    ) {
      if (this.params.animate) {
        mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.01;
        mesh.rotation.z += 0.01;
      }

      // requestAnimationFrame(this.animate);

      // for (let i = 0; i < planeObjects.length; i++) {
      //   const plane = planes[i];
      //   const po = planeObjects[i];
      //   plane.coplanarPoint(po.position);
      //   po.lookAt(
      //     po.position.x - plane.normal.x,
      //     po.position.y - plane.normal.y,
      //     po.position.z - plane.normal.z
      //   );
      // }
    },
  },
});
</script>

<style>
body,
html {
  margin: 0;
}

canvas {
  display: block;
}
</style>
