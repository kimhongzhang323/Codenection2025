package com.example.AutoDocX.service;

import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        // You can extract GitHub profile info here
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        String userNameAttr = userRequest.getClientRegistration()
                .getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();

        System.out.println("OAuth2 Provider: " + registrationId);
        System.out.println("User Attributes: " + oAuth2User.getAttributes());


        return oAuth2User;
    }
}
