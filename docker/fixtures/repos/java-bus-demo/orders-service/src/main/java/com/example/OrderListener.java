package com.example;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class OrderListener {
  private final RabbitTemplate rabbitTemplate;

  public OrderListener(RabbitTemplate rabbitTemplate) {
    this.rabbitTemplate = rabbitTemplate;
  }

  @RabbitListener(queues = "orders.created")
  public void onCreated(OrderCreatedEvent event) {
    rabbitTemplate.convertAndSend("orders.processed", event);
  }
}
