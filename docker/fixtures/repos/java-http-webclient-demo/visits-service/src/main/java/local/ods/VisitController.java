package local.ods;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/visits")
public final class VisitController {
  @PostMapping
  public void createVisit() {}

  @GetMapping("/{id}")
  public String getVisit(@PathVariable("id") String id) {
    return id;
  }
}
