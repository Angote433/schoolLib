package com.arnold.autolibrary.security;

import com.arnold.autolibrary.exception.NoStreamAssignedException;
import com.arnold.autolibrary.model.Role;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.repo.UserDetailsRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

// Resolves the currently authenticated user from the SecurityContext and
// provides the reusable stream-ownership check every scoped service call
// must run before returning or mutating data.
//
// NEVER trust a userId/streamId sent by the client for an authorization
// decision — a teacher could otherwise just send someone else's id.
// Client-sent ids may still be used to pick *which record* to act on;
// the permission check must always come from here.
@Component
public class AuthUtil {

    @Autowired
    private UserDetailsRepo userDetailsRepo;

    // JwtAuthFilter sets the authentication principal to the plain
    // username string, so Authentication#getName() is the username.
    public UserDetails getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
            throw new AccessDeniedException("Not authenticated");
        }
        return userDetailsRepo.findByUserName(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
    }

    public boolean isLibrarian(UserDetails user) {
        return user.getRole() == Role.LIBRARIAN;
    }

    // Returns the stream a teacher is allowed to act on.
    // Throws NoStreamAssignedException (409) if the teacher has no stream.
    public Integer getCallerStreamId(UserDetails user) {
        if (user.getStream() == null) {
            throw new NoStreamAssignedException("No stream assigned. Contact your librarian.");
        }
        return user.getStream().getStreamId();
    }

    // Librarian: always allowed.
    // Teacher: allowed only if targetStreamId equals their own stream.
    // Otherwise throws AccessDeniedException (403).
    public void assertCanAccessStream(UserDetails caller, Integer targetStreamId) {
        if (isLibrarian(caller)) {
            return;
        }
        Integer callerStreamId = getCallerStreamId(caller);
        if (targetStreamId == null || !callerStreamId.equals(targetStreamId)) {
            throw new AccessDeniedException("You do not have access to this stream.");
        }
    }

    // Defense-in-depth check for endpoints already locked to LIBRARIAN at
    // the SecurityConfig route level — a second layer at the data level.
    public void assertLibrarian(UserDetails caller) {
        if (!isLibrarian(caller)) {
            throw new AccessDeniedException("Librarian access required.");
        }
    }
}
