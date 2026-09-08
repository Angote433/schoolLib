package com.arnold.autolibrary;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@SpringBootApplication
public class AutolibraryApplication {

	private static final Logger log = LoggerFactory.getLogger(AutolibraryApplication.class);

	@Value("${server.port}")
	private String port;

	@Value("${spring.datasource.url}")
	private String datasourceUrl;

	public static void main(String[] args) {
		SpringApplication.run(AutolibraryApplication.class, args);
	}

	// Confirms which config actually loaded once the app is fully up —
	// useful for spotting a wrong profile/port/db at a glance.
	@EventListener(ApplicationReadyEvent.class)
	public void logStartup(ApplicationReadyEvent event) {
		Environment env = event.getApplicationContext().getEnvironment();
		String[] profiles = env.getActiveProfiles();
		String profile = profiles.length == 0 ? "default" : String.join(",", profiles);
		String db = datasourceUrl.substring(datasourceUrl.lastIndexOf('/') + 1).split("\\?")[0];
		log.info("Autolibrary started: profile={} port={} db={}", profile, port, db);
	}

	@Bean
	public WebMvcConfigurer corsConfigurer() {
		return new WebMvcConfigurer() {
			@Override
			public void addCorsMappings(CorsRegistry registry) {
				registry.addMapping("/api/**")
						.allowedOrigins("http://localhost:3000")
						.allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
						.allowedHeaders("*")
						.allowCredentials(true);
			}
		};
	}

}
