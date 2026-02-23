import torch
import threading

class ZImageModel:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ZImageModel, cls).__new__(cls)
            cls._instance.pipe = None
            cls._instance.is_loading = False
            cls._instance.load_error = None
            cls._instance._lock = threading.Lock()
        return cls._instance

    def load_model(self):
        if self.pipe is not None or self.is_loading:
            return

        with self._lock:
            if self.pipe is not None:
                return
            self.is_loading = True
            self.load_error = None

        try:
            from modelscope import snapshot_download
            from diffusers import ZImagePipeline

            MODEL_ID = "iximbox/Z-Image-INT8"
            print(f"Downloading model {MODEL_ID} from ModelScope...")
            local_dir = snapshot_download(MODEL_ID)
            print(f"Model downloaded to: {local_dir}")

            # Detect device
            if torch.cuda.is_available():
                device = "cuda"
                dtype = torch.bfloat16
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                device = "mps"
                dtype = torch.bfloat16
            else:
                device = "cpu"
                dtype = torch.float32

            print(f"Loading pipeline on device={device}, dtype={dtype}...")
            pipe = ZImagePipeline.from_pretrained(
                local_dir,
                torch_dtype=dtype,
                low_cpu_mem_usage=True,
            )
            pipe.enable_attention_slicing()

            if device == "cuda":
                pipe.enable_model_cpu_offload()
            else:
                pipe = pipe.to(device)

            self.pipe = pipe
            self._device = device
            print("Model loaded successfully.")

        except Exception as e:
            self.load_error = str(e)
            print(f"Error loading model: {e}")
        finally:
            self.is_loading = False

    def generate(
        self,
        prompt: str,
        negative_prompt: str,
        seed: int = 42,
        steps: int = 30,
        guidance: float = 4.0,
        width: int = 1024,
        height: int = 1024,
    ):
        if not self.pipe:
            raise RuntimeError(
                "Model is not loaded. " + (self.load_error or "Still initializing.")
            )

        print(
            f"Generating: prompt={prompt[:40]}... seed={seed}, "
            f"steps={steps}, guidance={guidance}, {width}x{height}"
        )

        generator = torch.Generator(device="cpu").manual_seed(seed)

        result = self.pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            height=height,
            width=width,
            num_inference_steps=steps,
            guidance_scale=guidance,
            generator=generator,
        )

        image = result.images[0]
        print("Generation complete.")
        return image


model_instance = ZImageModel()
