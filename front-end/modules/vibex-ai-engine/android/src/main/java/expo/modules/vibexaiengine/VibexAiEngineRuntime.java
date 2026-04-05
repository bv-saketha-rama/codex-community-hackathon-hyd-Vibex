package expo.modules.vibexaiengine;

import android.util.Base64;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

final class VibexAiEngineRuntime {
  private static final String PACKAGE = "com.google.ai.edge.litertlm.";

  private Object engine;

  void prepareModel(String modelPath, String cacheDir) throws Exception {
    closeModel();

    Class<?> backendClass = loadClass("Backend");
    Object cpuBackend = loadClass("Backend$CPU").getConstructor().newInstance();
    Object engineConfig =
      loadClass("EngineConfig")
        .getConstructor(
          String.class,
          backendClass,
          backendClass,
          backendClass,
          Integer.class,
          String.class
        )
        .newInstance(
          modelPath,
          cpuBackend,
          cpuBackend,
          cpuBackend,
          Integer.valueOf(2048),
          cacheDir
        );
    Object nextEngine = loadClass("Engine").getConstructor(loadClass("EngineConfig")).newInstance(engineConfig);
    loadClass("Engine").getMethod("initialize").invoke(nextEngine);
    engine = nextEngine;
  }

  void closeModel() {
    if (engine == null) {
      return;
    }

    try {
      loadClass("Engine").getMethod("close").invoke(engine);
    } catch (Exception ignored) {
      // Ignore clean-up failures and allow a fresh engine to be created.
    } finally {
      engine = null;
    }
  }

  String generateText(
    String prompt,
    String systemInstruction,
    List<String> imageBase64s,
    List<String> audioBase64s
  ) throws Exception {
    if (engine == null) {
      throw new IllegalStateException("Model is not prepared yet.");
    }

    Object systemInstructionContents =
      systemInstruction != null && !systemInstruction.isBlank()
        ? invokeContentsFactory("of", new Class<?>[] { String.class }, systemInstruction)
        : null;

    Object conversation =
      loadClass("Engine")
        .getMethod("createConversation", loadClass("ConversationConfig"))
        .invoke(
          engine,
          loadClass("ConversationConfig")
            .getConstructor(
              loadClass("Contents"),
              List.class,
              List.class,
              loadClass("SamplerConfig"),
              boolean.class
            )
            .newInstance(
              systemInstructionContents,
              Collections.emptyList(),
              Collections.emptyList(),
              loadClass("SamplerConfig")
                .getConstructor(int.class, double.class, double.class, int.class)
                .newInstance(40, 0.95d, 0.2d, 0),
              false
            )
        );

    try {
      List<Object> contents = new ArrayList<>();
      Constructor<?> imageCtor = loadClass("Content$ImageBytes").getConstructor(byte[].class);
      Constructor<?> audioCtor = loadClass("Content$AudioBytes").getConstructor(byte[].class);
      Constructor<?> textCtor = loadClass("Content$Text").getConstructor(String.class);

      for (String imageBase64 : imageBase64s) {
        contents.add(imageCtor.newInstance(decodeBase64Payload(imageBase64)));
      }
      for (String audioBase64 : audioBase64s) {
        contents.add(audioCtor.newInstance(decodeBase64Payload(audioBase64)));
      }
      if (prompt != null && !prompt.isBlank()) {
        contents.add(textCtor.newInstance(prompt));
      }

      Object response =
        loadClass("Conversation")
          .getMethod("sendMessage", loadClass("Contents"))
          .invoke(conversation, invokeContentsFactory("of", new Class<?>[] { List.class }, contents));
      return response.toString();
    } finally {
      try {
        loadClass("Conversation").getMethod("close").invoke(conversation);
      } catch (Exception ignored) {
        // Ignore conversation clean-up failures.
      }
    }
  }

  private byte[] decodeBase64Payload(String value) {
    String normalized = value != null && value.contains("base64,") ? value.substring(value.indexOf("base64,") + 7) : value;
    return Base64.decode(normalized, Base64.DEFAULT);
  }

  private Class<?> loadClass(String name) throws ClassNotFoundException {
    return Class.forName(PACKAGE + name);
  }

  private Object invokeContentsFactory(String methodName, Class<?>[] parameterTypes, Object argument)
    throws Exception {
    Field companionField = loadClass("Contents").getField("Companion");
    Object companion = companionField.get(null);
    Method method = companion.getClass().getMethod(methodName, parameterTypes);
    return method.invoke(companion, argument);
  }
}
