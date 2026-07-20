package local.ods;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "visits-service", path = "/visits")
public interface VisitFeignClient {
  @GetMapping("/{id}")
  String getVisit(@PathVariable("id") String id);
}
