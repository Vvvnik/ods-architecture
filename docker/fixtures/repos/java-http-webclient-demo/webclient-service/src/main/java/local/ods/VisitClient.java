package local.ods;

import org.springframework.web.reactive.function.client.WebClient;

public final class VisitClient {
  private final WebClient webClient = WebClient.create("http://visits-service");

  public void createVisit() {
    webClient.post().uri("http://visits-service/visits").retrieve();
  }
}
