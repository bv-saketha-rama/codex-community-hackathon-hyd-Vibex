package expo.modules.vibexaiengine

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class VibexAiEngineModule : Module() {
  private var currentModelId = ""
  private var currentVersion = ""
  private var currentLocalUri: String? = null
  private val runtime = VibexAiEngineRuntime()

  private fun closeEngine() {
    runtime.closeModel()
  }

  private fun currentStatus(
    state: String = if (currentLocalUri != null) "ready" else "idle",
    error: String? = null
  ): Map<String, Any?> {
    return mapOf(
      "modelId" to currentModelId,
      "version" to currentVersion,
      "state" to state,
      "bytesDownloaded" to 0,
      "totalBytes" to 0,
      "percentage" to if (state == "ready") 100 else 0,
      "localUri" to currentLocalUri,
      "error" to error
    )
  }

  override fun definition() = ModuleDefinition {
    Name("VibexAiEngine")

    Events("onChange", "onModelStateChanged")

    AsyncFunction("getStatusAsync") {
      if (currentLocalUri == null) {
        return@AsyncFunction null
      }

      currentStatus()
    }

    AsyncFunction("prepareModelAsync") { localUri: String, modelId: String, version: String ->
      closeEngine()
      currentModelId = modelId
      currentVersion = version

      val modelFile = File(localUri.removePrefix("file://"))
      if (!modelFile.exists()) {
        val errorStatus = currentStatus(state = "failed", error = "Model file is missing.")
        sendEvent("onModelStateChanged", errorStatus)
        return@AsyncFunction errorStatus
      }

      try {
        runtime.prepareModel(modelFile.absolutePath, appContext.reactContext?.cacheDir?.absolutePath)
      } catch (error: Exception) {
        currentLocalUri = null
        val errorStatus =
          currentStatus(state = "failed", error = error.message ?: "Unable to initialize Gemma.")
        sendEvent("onModelStateChanged", errorStatus)
        return@AsyncFunction errorStatus
      }

      currentLocalUri = localUri
      val readyStatus = currentStatus()
      sendEvent("onModelStateChanged", readyStatus)
      readyStatus
    }

    AsyncFunction("closeModelAsync") {
      closeEngine()
      currentModelId = ""
      currentVersion = ""
      currentLocalUri = null
      val status = currentStatus(state = "idle")
      sendEvent("onModelStateChanged", status)
      status
    }

    AsyncFunction("generateTextAsync") {
        prompt: String,
        systemInstruction: String?,
        imageBase64s: List<String>,
        audioBase64s: List<String> ->
      mapOf(
        "text" to runtime.generateText(prompt, systemInstruction, imageBase64s, audioBase64s)
      )
    }
  }
}
